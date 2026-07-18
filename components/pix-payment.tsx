'use client'

import { useState, useEffect } from 'react'
import { Copy, CheckCircle2, QrCode, Clock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PixPaymentProps {
  total: number
  orderNumber: number
  onPaymentConfirmed?: () => void
}

interface PixData {
  id: number
  qr_code: string
  qr_code_base64: string | null
  status: string
}

export function PixPayment({ total, orderNumber, onPaymentConfirmed }: PixPaymentProps) {
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notYetPaid, setNotYetPaid] = useState(false)

  useEffect(() => {
    const createPix = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/pix/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total, orderNumber }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar PIX')
        setPixData(data)
      } catch (err: any) {
        setError(err.message || 'Erro ao gerar cobrança PIX')
      } finally {
        setLoading(false)
      }
    }
    createPix()
  }, [total, orderNumber])

  // Polling automático — verifica status a cada 5s após QR Code gerado
  useEffect(() => {
    if (!pixData?.id || confirmed) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${pixData.id}`)
        const data = await res.json()
        if (data.status === 'approved') {
          clearInterval(interval)
          setConfirmed(true)
          onPaymentConfirmed?.()
        }
      } catch {
        // silencia erro de rede, tenta novamente no próximo ciclo
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [pixData?.id, confirmed, onPaymentConfirmed])

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const pixCode = pixData?.qr_code ?? ''

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const handleConfirm = async () => {
    if (!pixData?.id) return
    setChecking(true)
    setNotYetPaid(false)
    try {
      const res = await fetch(`/api/pix/status/${pixData.id}`)
      const data = await res.json()
      if (data.status === 'approved') {
        setConfirmed(true)
        onPaymentConfirmed?.()
      } else {
        // Não fingimos sucesso: se o Mercado Pago ainda não confirmou o
        // pagamento, avisamos a pessoa em vez de liberar o pedido sem pagar.
        setNotYetPaid(true)
      }
    } catch {
      setNotYetPaid(true)
    } finally {
      setChecking(false)
    }
  }

  if (confirmed) {
    return (
      <div className="text-center p-8">
        <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Pagamento Confirmado!</h3>
        <p className="text-muted-foreground">Seu pedido está sendo preparado.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">Pagamento via PIX</h3>
        <p className="text-3xl font-bold text-primary">{formatPrice(total)}</p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Gerando cobrança PIX...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Verifique se o token do Mercado Pago está configurado nas variáveis de ambiente.
          </p>
        </div>
      )}

      {!loading && !error && pixData && (
        <>
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="w-52 h-52 bg-white rounded-xl p-3 shadow-md flex items-center justify-center">
              {pixData.qr_code_base64 ? (
                <img
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-28 h-28 text-foreground" />
              )}
            </div>
          </div>

          {/* PIX Copia e Cola */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">Ou copie o código PIX:</p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg text-xs text-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                {pixCode}
              </div>
              <Button onClick={copyToClipboard} variant="outline" className="shrink-0">
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={checking}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {checking ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Verificando pagamento...
              </>
            ) : (
              'Já paguei'
            )}
          </Button>

          {notYetPaid && (
            <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Ainda não identificamos o seu pagamento. Se você já pagou, aguarde alguns segundos — a confirmação é automática.</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            O pagamento será confirmado automaticamente. O QR Code expira em 30 minutos.
          </p>

          {/* Instructions */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">Como pagar:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escolha pagar com PIX</li>
              <li>Escaneie o QR Code ou cole o código</li>
              <li>Confirme o pagamento</li>
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
