import { useState } from "react";
import { Key, Copy, Check, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { GitEndpoint } from "./SettingsPanel";

interface TokenGeneratorProps {
  onBack: () => void;
}

interface TokenResponse {
  status: number;
  data: {
    token: {
      access_token: string;
      refresh_token: string;
      temp_token: string;
      expires_at: string;
      refresh_expires_at: string;
    };
    user_info: any;
    otp_token: string;
    devices: any[];
    device_limit: string;
    device_message: any;
  };
  message: string;
}

const getAuthUrl = (endpoint: GitEndpoint): string => {
  switch (endpoint) {
    case "prod":
      return "https://api.10minuteschool.com/auth/v1/login";
    case "stage":
    case "local":
      return "https://local-api.10minuteschool.net/auth/v1/login";
  }
};

export function TokenGenerator({ onBack }: TokenGeneratorProps) {
  const [endpoint, setEndpoint] = useState<GitEndpoint>("prod");
  const [username, setUsername] = useState("+8801718067555");
  const [loginType, setLoginType] = useState("phone");
  const [password, setPassword] = useState("12345678");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isResponseOpen, setIsResponseOpen] = useState(false);

  const handleGenerate = async () => {
    if (!username || !loginType || !password) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTokenResponse(null);

    try {
      const response = await fetch(getAuthUrl(endpoint), {
        method: "POST",
        headers: {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          "content-type": "application/json",
          "origin": "https://local.10minuteschool.net",
          "referer": "https://local.10minuteschool.net/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "x-tenms-source-lang": "bn",
          "x-tenms-source-platform": "web"
        },
        body: JSON.stringify({
          username,
          loginType,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.status !== 0) {
        throw new Error(data.message || "Login failed");
      }

      setTokenResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate token");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Generate Access Token
          </CardTitle>
          <CardDescription>
            Generate authentication tokens for TenTen AI services
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* API Endpoint Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Choose API Endpoint</Label>
          <div className="grid grid-cols-3 gap-2">
            <div
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                endpoint === "prod"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setEndpoint("prod")}
            >
              <Badge variant={endpoint === "prod" ? "default" : "outline"}>
                Prod
              </Badge>
            </div>
            <div
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                endpoint === "stage"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setEndpoint("stage")}
            >
              <Badge variant={endpoint === "stage" ? "default" : "outline"}>
                Stage
              </Badge>
            </div>
            <div
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                endpoint === "local"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setEndpoint("local")}
            >
              <Badge variant={endpoint === "local" ? "default" : "outline"}>
                Local
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Auth URL: {getAuthUrl(endpoint)}
          </p>
        </div>

        {/* Login Credentials */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Login Credentials</Label>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loginType">Login Type</Label>
            <Input
              id="loginType"
              placeholder="e.g., phone, email"
              value={loginType}
              onChange={(e) => setLoginType(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !username || !loginType || !password}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Token"}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Token Display */}
        {tokenResponse && (
          <div className="space-y-4">
            <Label className="text-base font-medium text-green-600">
              ✓ Tokens Generated Successfully
            </Label>

            {/* Access Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Access Token</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(tokenResponse.data.token.access_token, "access")
                  }
                >
                  {copiedField === "access" ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg border">
                <code className="text-xs break-all">
                  {tokenResponse.data.token.access_token}
                </code>
              </div>
            </div>

            {/* Refresh Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Refresh Token</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(tokenResponse.data.token.refresh_token, "refresh")
                  }
                >
                  {copiedField === "refresh" ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg border">
                <code className="text-xs break-all">
                  {tokenResponse.data.token.refresh_token}
                </code>
              </div>
            </div>

            {/* Full Response (Collapsible) */}
            <Collapsible open={isResponseOpen} onOpenChange={setIsResponseOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>Full API Response</span>
                  {isResponseOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-4 bg-muted rounded-lg border max-h-96 overflow-y-auto">
                  <pre className="text-xs">
                    {JSON.stringify(tokenResponse, null, 2)}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
