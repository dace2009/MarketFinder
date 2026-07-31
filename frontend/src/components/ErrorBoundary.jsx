import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <h2>Algo salió mal</h2>
          <p>Ocurrió un error inesperado en esta sección.</p>
          <button className="btn-primary" onClick={() => this.setState({ hasError: false })}>
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
