import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Access Denied
          </CardTitle>
          <CardDescription className="text-slate-600">
            Your account is not authorized to access the TB Command Center
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-slate-500">
            Please contact the M&E administrator to request access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}