import { useEffect, useRef, useState } from 'react'

interface UseWebSocketReturn {
  lastMessage: string | null
  sendMessage: (message: string) => void
  readyState: number
  isConnected: boolean
}

export function useWebSocket(url: string | undefined): UseWebSocketReturn {
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!url) {
      setReadyState(WebSocket.CLOSED)
      return
    }

    try {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setReadyState(WebSocket.OPEN)
    }

    ws.onmessage = (event) => {
      setLastMessage(event.data)
    }

      ws.onerror = () => {
        // Silently handle WebSocket connection errors
        setReadyState(WebSocket.CLOSED)
    }

    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED)
    }

    return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
        }
      }
    } catch (error) {
      // Handle WebSocket creation errors silently
      setReadyState(WebSocket.CLOSED)
    }
  }, [url])

  const sendMessage = (message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message)
    }
  }

  return {
    lastMessage,
    sendMessage,
    readyState,
    isConnected: readyState === WebSocket.OPEN,
  }
}

