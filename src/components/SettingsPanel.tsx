import { useState } from "react";
import { Settings, GitBranch, Server, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ApiMode = "n8n" | "remote-git" | "local-git";

export interface ApiConfiguration {
  mode: ApiMode;
  authorizationToken: string;
  sessionId: string | null;
  threadId: number;
  remoteGitUrl: string;
  localGitUrl: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: ApiConfiguration;
  onConfigChange: (config: ApiConfiguration) => void;
}

const DEFAULT_CONFIG: ApiConfiguration = {
  mode: "n8n",
  authorizationToken: "",
  sessionId: null,
  threadId: 1,
  remoteGitUrl: "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/messages",
  localGitUrl: "http://localhost:8000/api/v1/messages"
};

export function SettingsPanel({ isOpen, onClose, currentConfig, onConfigChange }: SettingsPanelProps) {
  const [config, setConfig] = useState<ApiConfiguration>(currentConfig);

  const handleSave = () => {
    onConfigChange(config);
    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const updateConfig = (updates: Partial<ApiConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              TenTen AI Settings
            </CardTitle>
            <CardDescription>
              Configure API endpoints and authentication for different TenTen AI services
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* API Mode Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">API Mode</Label>
            <div className="grid grid-cols-1 gap-3">
              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "n8n" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "n8n" })}
              >
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">N8N Webhook</div>
                    <div className="text-sm text-muted-foreground">Default TenTen AI service via N8N</div>
                  </div>
                </div>
                <Badge variant={config.mode === "n8n" ? "default" : "outline"}>
                  Default
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "remote-git" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "remote-git" })}
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Connect to Remote TenTen Git</div>
                    <div className="text-sm text-muted-foreground">FastAPI service on remote server</div>
                  </div>
                </div>
                <Badge variant={config.mode === "remote-git" ? "default" : "outline"}>
                  Remote
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "local-git" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "local-git" })}
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Connect to Local TenTen Git</div>
                    <div className="text-sm text-muted-foreground">FastAPI service on localhost</div>
                  </div>
                </div>
                <Badge variant={config.mode === "local-git" ? "default" : "outline"}>
                  Local
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuration for Git modes */}
          {(config.mode === "remote-git" || config.mode === "local-git") && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <Label className="text-base font-medium">FastAPI Configuration</Label>
              </div>

              {/* Authorization Token */}
              <div className="space-y-2">
                <Label htmlFor="auth-token">Authorization Token</Label>
                <Textarea
                  id="auth-token"
                  placeholder="Enter your JWT authorization token..."
                  value={config.authorizationToken}
                  onChange={(e) => updateConfig({ authorizationToken: e.target.value })}
                  className="min-h-[80px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  JWT token for authentication with the service
                </p>
              </div>

              {/* Session ID */}
              <div className="space-y-2">
                <Label htmlFor="session-id">Session ID (Optional)</Label>
                <Input
                  id="session-id"
                  placeholder="Leave empty for null"
                  value={config.sessionId || ""}
                  onChange={(e) => updateConfig({ 
                    sessionId: e.target.value.trim() || null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Session identifier. Leave empty to send as null.
                </p>
              </div>

              {/* Thread ID */}
              <div className="space-y-2">
                <Label htmlFor="thread-id">Thread ID</Label>
                <Input
                  id="thread-id"
                  type="number"
                  placeholder="7"
                  value={config.threadId}
                  onChange={(e) => updateConfig({ 
                    threadId: parseInt(e.target.value) || 7 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Thread identifier for conversation context. Defaults to 1. For stage env, use 1 for Math, 2 for Chemistry, 4 for Biology, 7 for Physics.
                </p>
              </div>

              {/* API URLs (Editable) */}
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <Input
                  value={config.mode === "remote-git" ? config.remoteGitUrl : config.localGitUrl}
                  onChange={(e) => {
                    if (config.mode === "remote-git") {
                      updateConfig({ remoteGitUrl: e.target.value });
                    } else {
                      updateConfig({ localGitUrl: e.target.value });
                    }
                  }}
                  className="font-mono text-sm"
                  placeholder="Enter API endpoint URL"
                />
                {config.mode === "remote-git" && (
                  <div className="space-y-1">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ HTTPS is required when accessing from HTTPS pages (like lovable.app)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateConfig({ remoteGitUrl: "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/messages" })}
                        className="text-xs"
                      >
                        Use HTTPS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateConfig({ remoteGitUrl: "http://local-api.10minuteschool.net/tenten-ai-service/api/v1/messages" })}
                        className="text-xs"
                      >
                        Use HTTP
                      </Button>
                    </div>
                  </div>
                )}
                {config.mode === "local-git" && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    ℹ️ Local development endpoint (HTTP allowed for localhost)
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
