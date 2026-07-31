import { useState, useEffect, useRef, useCallback } from 'react'

export default function useWhatsApp(wsUrl = 'ws://127.0.0.1:11435') {
  const [status, setStatus] = useState('disconnected')
  const [qr, setQr] = useState(null)
  const [messagesByChat, setMessagesByChat] = useState({})
  const [chats, setChats] = useState([])
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const requestIdRef = useRef(0)
  const pendingRequests = useRef({})

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    let ws
    try {
      ws = new WebSocket(wsUrl)
    } catch {
      setStatus('disconnected')
      scheduleReconnect()
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      setQr(null)
      ws.send(JSON.stringify({ type: 'get-chats' }))
    }

    ws.onmessage = (event) => {
      let data
      try {
        data = JSON.parse(event.data)
      } catch { return }

      switch (data.type) {
        case 'qr':
          setQr(data.qr)
          setStatus('qr')
          break

        case 'auth-state':
          if (data.state === 'ready') {
            setStatus('ready')
            setQr(null)
            ws.send(JSON.stringify({ type: 'get-chats' }))
          } else if (data.state === 'authenticated') {
            setStatus('authenticated')
          } else if (data.state === 'disconnected') {
            setStatus('disconnected')
            scheduleReconnect()
          }
          break

        case 'ready':
          setStatus('ready')
          setQr(null)
          break

        case 'message':
          setMessagesByChat((prev) => {
            const phone = data.from
            const chatMsgs = prev[phone] || []
            const exists = chatMsgs.some((m) => m.id === data.id)
            if (exists) return prev
            const updated = {
              ...prev,
              [phone]: [...chatMsgs, {
                from: data.fromMe ? 'me' : data.from,
                body: data.body,
                timestamp: data.timestamp,
                fromMe: data.fromMe,
                id: data.id,
              }],
            }
            return updated
          })
          break

        case 'messages':
          if (data.messages) {
            setMessagesByChat((prev) => ({
              ...prev,
              [data.phone]: data.messages,
            }))
          }
          break

        case 'chats':
          if (data.chats) {
            setChats(data.chats)
          }
          break

        case 'send-result':
          if (data.error) {
            const reqId = data.requestId
            if (reqId && pendingRequests.current[reqId]) {
              pendingRequests.current[reqId]({ error: data.error })
              delete pendingRequests.current[reqId]
            }
          }
          break

        default:
          break
      }
    }

    ws.onclose = () => {
      if (wsRef.current === ws) {
        setStatus('disconnected')
        scheduleReconnect()
      }
    }

    ws.onerror = () => {
      if (wsRef.current === ws) {
        ws.close()
      }
    }
  }, [wsUrl])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null
      connect()
    }, 5000)
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((phone, message) => {
    return new Promise((resolve) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        resolve({ error: 'WhatsApp no conectado' })
        return
      }
      // Optimistic update: show sent message immediately
      const tempMsg = {
        from: 'me',
        body: message,
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        id: `temp-${Date.now()}`,
      }
      setMessagesByChat((prev) => ({
        ...prev,
        [phone]: [...(prev[phone] || []), tempMsg],
      }))
      const requestId = ++requestIdRef.current
      pendingRequests.current[requestId] = resolve
      wsRef.current.send(JSON.stringify({
        type: 'send',
        phone,
        message,
        requestId,
      }))
      setTimeout(() => {
        if (pendingRequests.current[requestId]) {
          delete pendingRequests.current[requestId]
          resolve({ error: 'Timeout' })
        }
      }, 15000)
    })
  }, [])

  const getMessages = useCallback((phone, limit = 50) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get-messages', phone, limit }))
    }
  }, [])

  const refreshChats = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get-chats' }))
    }
  }, [])

  return {
    status,
    qr,
    messagesByChat,
    chats,
    sendMessage,
    getMessages,
    refreshChats,
    reconnect: connect,
  }
}
