'use client'

import { useState, useEffect } from 'react'
import { X, Building2, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatAddress } from '@/lib/utils'

interface Property {
  id: string
  tokenId: number
  propertyType: string
  value: bigint
  yieldRate: number
  totalYieldEarned: bigint
}

interface VisitPortfolioProps {
  address: string
  username?: string
  onClose: () => void
}

export function VisitPortfolio({ address, username, onClose }: VisitPortfolioProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalValue, setTotalValue] = useState<bigint>(BigInt(0))
  const [totalYield, setTotalYield] = useState<bigint>(BigInt(0))

  useEffect(() => {
    loadPortfolio()
  }, [address])

  const loadPortfolio = async () => {
    setIsLoading(true)
    try {
      const data = await api.get(`/properties/owner/${address}`)
      setProperties(data.properties || [])
      setTotalValue(data.totalValue || BigInt(0))
      setTotalYield(data.totalYield || BigInt(0))
    } catch (error) {
      console.error('Failed to load portfolio:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatValue = (value: bigint) => {
    const amount = Number(value) / 1e18
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-white/20 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-gray-900 border-b border-white/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {username || formatAddress(address)}'s Portfolio
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">{formatAddress(address)}</p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="text-white">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Total Value</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatValue(totalValue)} TYCOON</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-gray-400">Total Yield</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatValue(totalYield)} TYCOON</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-lg font-semibold text-white mb-4">Properties ({properties.length})</h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading portfolio...</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No properties found</div>
          ) : (
            <div className="space-y-3">
              {properties.map((property) => (
                <Card key={property.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">{property.propertyType} Property</h4>
                        <p className="text-sm text-gray-400">Token ID: {property.tokenId}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatValue(property.value)} TYCOON
                          </span>
                          <span>{property.yieldRate}% APY</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Yield Earned</p>
                        <p className="text-emerald-400 font-semibold">{formatValue(property.totalYieldEarned)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


