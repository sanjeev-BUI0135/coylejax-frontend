import React from "react"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"
import Swal from "sweetalert2"
import { Badge } from "@/components/ui/badge"

export function ConvertToProjectButton({ estimate, onConvert, disabled = false }) {
  // Only show for approved quick estimates that haven't been converted
  if (!estimate.is_quick_estimate || 
      estimate.status !== 'approved' || 
      estimate.converted_to_project) {
    return null
  }

  const handleConvert = () => {
    // Trigger the parent component to open ProjectForm with estimate data
    if (onConvert) {
      onConvert(estimate)
    }
  }

  return (
    <Button
      onClick={handleConvert}
      disabled={disabled}
      className="bg-green-600 hover:bg-green-700"
      size="sm"
    >
      <Building2 className="w-4 h-4 mr-2" />
      Convert to Project
    </Button>
  )
}

export function QuickEstimateBadge({ estimate }) {
  if (!estimate.is_quick_estimate) return null

  return (
    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
      Quick Estimate
    </Badge>
  )
}

export function ConvertedBadge({ estimate }) {
  if (!estimate.converted_to_project) return null

  return (
    <Badge variant="secondary" className="bg-green-100 text-green-800">
      Converted to Project
    </Badge>
  )
}