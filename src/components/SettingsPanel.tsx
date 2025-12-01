import { useState, useEffect } from "react";
import { Settings, GitBranch, Server, X, FlaskConical, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EvaluationMode } from "./EvaluationMode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ApiMode = "n8n" | "tenten-git" | "tenten-video";
export type GitEndpoint = "prod" | "stage" | "local";

export interface ApiConfiguration {
  mode: ApiMode;
  authorizationToken: string;
  sessionId: string | null;
  threadId: number;
  gitEndpoint: GitEndpoint;
  customGitUrl?: string;
  contentType: string | null;
  contentId: string | null;
  segmentId: number | null;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: ApiConfiguration;
  onConfigChange: (config: ApiConfiguration) => void;
}

const DEFAULT_CONFIG: ApiConfiguration = {
  mode: "tenten-git",
  authorizationToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzN2I1ZWQ0NmE2MzYzODU3MzNlZjJiZCIsImlzX2FkbWluIjpmYWxzZSwiY29udGFjdCI6IiIsImVtYWlsIjoiYWRtaW5AMTBtcy5jb20iLCJsb2dpbl90eXBlIjoiZW1haWwiLCJsb2dpbl9zb3VyY2UiOiIxMG1pbnNjaG9vbCIsImxvZ2luX3RhcmdldCI6IiIsImxvZ2luX2FzIjowLCJuYW1lIjoiYWRtaW5AMTBtcy5jb20iLCJpc19hY3RpdmUiOmZhbHNlLCJ2ZXJpZmllZCI6dHJ1ZSwiZGV2aWNlX2lkIjoiNjkwMWFhZGIzMWY3ZGIyYzY2ZDZkMGUyIiwiZGV2aWNlIjp7ImRldmljZV9pZCI6IjY5MDFhYWRiMzFmN2RiMmM2NmQ2ZDBlMiIsIm1hY19pZCI6IiIsImRldmljZV9uYW1lIjoiQ2hyb21lIDEzOS4wLjAuMCIsImRldmljZV90eXBlIjoiYnJvd3NlciIsImRldmljZV9vcyI6IkludGVsIE1hYyBPUyBYIDEwXzE1XzciLCJwbGF0Zm9ybSI6IndlYiIsIm9yaWdpbiI6Imh0dHBzOi8vbG9jYWwuMTBtaW51dGVzY2hvb2wubmV0IiwiaXBfYWRkcmVzcyI6IjE2MC4zMC4xODkuMjAyIn0sInVzZXJfc3RhdHVzIjoiIiwiZGF0ZV9qb2luZWQiOiIyMDIyLTExLTIxVDExOjE5OjQ4LjI1M1oiLCJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYyMzIxNzU1fQ.PxcvwpSE53wq24WyXbPR7HflnXdSYL3LX42H0i-7lPE",
  sessionId: null,
  threadId: 7,
  gitEndpoint: "stage",
  contentType: null,
  contentId: null,
  segmentId: null
};

const getGitEndpointUrl = (endpoint: GitEndpoint): string => {
  switch (endpoint) {
    case "prod":
      return "https://api.10minuteschool.com/tenten-ai-service/api/v1/messages";
    case "stage":
      return "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/messages";
    case "local":
      return "http://localhost:8000/api/v1/messages";
  }
};

export function SettingsPanel({ isOpen, onClose, currentConfig, onConfigChange }: SettingsPanelProps) {
  const [config, setConfig] = useState<ApiConfiguration>(currentConfig);
  const [isEvalMode, setIsEvalMode] = useState(false);

  // Sync local state when currentConfig prop changes (e.g., after token refresh)
  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

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

  const handleBackFromEval = () => {
    setIsEvalMode(false);
  };

  if (!isOpen) return null;

  // Show Evaluation Mode if activated
  if (isEvalMode) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <EvaluationMode onBack={handleBackFromEval} />
      </div>
    );
  }

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
                    <div className="text-sm text-muted-foreground">TenTen AI service via N8N</div>
                  </div>
                </div>
                <Badge variant={config.mode === "n8n" ? "default" : "outline"}>
                  N8N
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "tenten-git" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "tenten-git" })}
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">Connect to TenTen Git</div>
                    <div className="text-sm text-muted-foreground">FastAPI service with configurable endpoint</div>
                  </div>
                </div>
                <Badge variant={config.mode === "tenten-git" ? "default" : "outline"}>
                  Git
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  "border-border hover:border-primary/50"
                )}
                onClick={() => setIsEvalMode(true)}
              >
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Connect to TenTen Evaluations</div>
                    <div className="text-sm text-muted-foreground">Configure and run AI evaluation experiments</div>
                  </div>
                </div>
                <Badge variant="outline">
                  Eval
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "tenten-video" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "tenten-video" })}
              >
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Connect to TenTen Video Mode</div>
                    <div className="text-sm text-muted-foreground">FastAPI service with video content support</div>
                  </div>
                </div>
                <Badge variant={config.mode === "tenten-video" ? "default" : "outline"}>
                  Video
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuration for TenTen Git mode */}
          {config.mode === "tenten-git" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <Label className="text-base font-medium">FastAPI Configuration</Label>
              </div>

              {/* API Endpoint Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose API Endpoint</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                      config.gitEndpoint === "prod" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateConfig({ gitEndpoint: "prod", customGitUrl: undefined })}
                  >
                    <Badge variant={config.gitEndpoint === "prod" ? "default" : "outline"}>
                      Prod
                    </Badge>
                  </div>
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                      config.gitEndpoint === "stage" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateConfig({ gitEndpoint: "stage", customGitUrl: undefined })}
                  >
                    <Badge variant={config.gitEndpoint === "stage" ? "default" : "outline"}>
                      Stage
                    </Badge>
                  </div>
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                      config.gitEndpoint === "local" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateConfig({ gitEndpoint: "local", customGitUrl: undefined })}
                  >
                    <Badge variant={config.gitEndpoint === "local" ? "default" : "outline"}>
                      Local
                    </Badge>
                  </div>
                </div>
              </div>

              {/* API URL (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="git-url">API Endpoint URL</Label>
                <Input
                  id="git-url"
                  value={config.customGitUrl || getGitEndpointUrl(config.gitEndpoint)}
                  onChange={(e) => updateConfig({ customGitUrl: e.target.value })}
                  className="font-mono text-sm"
                  placeholder="Enter API endpoint URL"
                />
                <p className="text-xs text-muted-foreground">
                  Default: {getGitEndpointUrl(config.gitEndpoint)}
                </p>
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
            </div>
          )}

          {/* Configuration for TenTen Video mode */}
          {config.mode === "tenten-video" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <Label className="text-base font-medium">Video Mode Configuration</Label>
              </div>

              {/* API Endpoint Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose API Endpoint</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                      config.gitEndpoint === "prod" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateConfig({ gitEndpoint: "prod", customGitUrl: undefined })}
                  >
                    <Badge variant={config.gitEndpoint === "prod" ? "default" : "outline"}>
                      Prod
                    </Badge>
                  </div>
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                      config.gitEndpoint === "stage" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateConfig({ gitEndpoint: "stage", customGitUrl: undefined })}
                  >
                    <Badge variant={config.gitEndpoint === "stage" ? "default" : "outline"}>
                      Stage
                    </Badge>
                  </div>
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                      config.gitEndpoint === "local" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateConfig({ gitEndpoint: "local", customGitUrl: undefined })}
                  >
                    <Badge variant={config.gitEndpoint === "local" ? "default" : "outline"}>
                      Local
                    </Badge>
                  </div>
                </div>
              </div>

              {/* API URL (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="video-git-url">API Endpoint URL</Label>
                <Input
                  id="video-git-url"
                  value={config.customGitUrl || getGitEndpointUrl(config.gitEndpoint)}
                  onChange={(e) => updateConfig({ customGitUrl: e.target.value })}
                  className="font-mono text-sm"
                  placeholder="Enter API endpoint URL"
                />
                <p className="text-xs text-muted-foreground">
                  Default: {getGitEndpointUrl(config.gitEndpoint)}
                </p>
              </div>

              {/* Authorization Token */}
              <div className="space-y-2">
                <Label htmlFor="video-auth-token">Authorization Token</Label>
                <Textarea
                  id="video-auth-token"
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
                <Label htmlFor="video-session-id">Session ID (Optional)</Label>
                <Input
                  id="video-session-id"
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
                <Label htmlFor="video-thread-id">Thread ID</Label>
                <Input
                  id="video-thread-id"
                  type="number"
                  placeholder="1"
                  value={config.threadId}
                  onChange={(e) => updateConfig({ 
                    threadId: parseInt(e.target.value) || 1 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Thread identifier for conversation context.
                </p>
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type (Optional)</Label>
                <Input
                  id="content-type"
                  placeholder="e.g., video"
                  value={config.contentType || ""}
                  onChange={(e) => updateConfig({ 
                    contentType: e.target.value.trim() || null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Type of content. Leave empty for null.
                </p>
              </div>

              {/* Content ID */}
              <div className="space-y-2">
                <Label htmlFor="content-id">Content ID (Optional)</Label>
                <Input
                  id="content-id"
                  placeholder="e.g., video-test"
                  value={config.contentId || ""}
                  onChange={(e) => updateConfig({ 
                    contentId: e.target.value.trim() || null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Identifier for the content. Leave empty for null.
                </p>
              </div>

              {/* Segment ID */}
              <div className="space-y-2">
                <Label htmlFor="segment-id">Segment ID (Optional)</Label>
                <Input
                  id="segment-id"
                  type="number"
                  placeholder="e.g., 10"
                  value={config.segmentId !== null ? config.segmentId : ""}
                  onChange={(e) => updateConfig({ 
                    segmentId: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Segment identifier. Leave empty for null.
                </p>
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
