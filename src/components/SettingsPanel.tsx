import { useState, useEffect } from "react";
import { Settings, GitBranch, Server, X, FlaskConical, Video, Key, FileText, BookOpen, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EvaluationMode } from "./EvaluationMode";
import { TokenGenerator } from "./TokenGenerator";
import { ExamExplanation } from "./ExamExplanation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getThreadOptions, getLabelFromThreadId } from "@/utils/threadMapping";

export type ApiMode = "n8n" | "tenten-git" | "tenten-video" | "tenten-exam" | "tenten-exam-explanation" | "tenten-vectorize";
export type GitEndpoint = "prod" | "stage" | "local";

export interface ApiConfiguration {
  mode: ApiMode;
  authorizationToken: string;
  sessionId: string | null;
  threadId: number | null;
  gitEndpoint: GitEndpoint;
  customGitUrl?: string;
  contentType: string | null;
  contentId: string | null;
  segmentId: number | null;
  examId: string | null;
  examSessionId: string | null;
  questionId: string | null;
  // Vectorize mode fields
  vectorizeSourceTitle: string | null;
  vectorizeSubject: string | null;
  vectorizeChapter: string | null;
  vectorizeSourceType: string | null;
  vectorizeGrade: string | null;
  vectorizeFileUrl: string | null;
  vectorizeTopics: string[];
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
  segmentId: 10,
  examId: null,
  examSessionId: null,
  questionId: null,
  vectorizeSourceTitle: null,
  vectorizeSubject: null,
  vectorizeChapter: null,
  vectorizeSourceType: null,
  vectorizeGrade: null,
  vectorizeFileUrl: null,
  vectorizeTopics: []
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

const getSegmentIdLabel = (segmentId: number): string => {
  switch (segmentId) {
    case 6:
      return "Class 6";
    case 7:
      return "Class 7";
    case 8:
      return "Class 8";
    case 9:
    case 101:
      return "SSC";
    case 10:
      return "HSC";
    default:
      return `Segment ${segmentId}`;
  }
};

const getSegmentIdValue = (segmentId: number): string => {
  switch (segmentId) {
    case 6:
      return "class-6";
    case 7:
      return "class-7";
    case 8:
      return "class-8";
    case 9:
    case 101:
      return "ssc";
    case 10:
      return "hsc";
    default:
      return `segment-${segmentId}`;
  }
};

const getVectorizeServiceKey = (endpoint: GitEndpoint): string => {
  switch (endpoint) {
    case "prod":
      return "base64:ZFF0d6f47cfw5ICllJVL8p+D2IoZw+8tQaCq6RSQsVo=";
    case "stage":
      return "tenms_stage_service_key";
    case "local":
      return "tenms_stage_service_key";
  }
};

export function SettingsPanel({ isOpen, onClose, currentConfig, onConfigChange }: SettingsPanelProps) {
  const [config, setConfig] = useState<ApiConfiguration>(currentConfig);
  const [isEvalMode, setIsEvalMode] = useState(false);
  const [isTokenGenerator, setIsTokenGenerator] = useState(false);
  const [isExamExplanation, setIsExamExplanation] = useState(false);

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

  const handleBackFromTokenGenerator = () => {
    setIsTokenGenerator(false);
  };

  const handleBackFromExamExplanation = () => {
    setIsExamExplanation(false);
  };

  if (!isOpen) return null;

  // Show Exam Explanation if activated
  if (isExamExplanation) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <ExamExplanation 
          onBack={handleBackFromExamExplanation} 
          initialConfig={{
            questionId: config.questionId,
            gitEndpoint: config.gitEndpoint,
            authorizationToken: config.authorizationToken,
            customGitUrl: config.customGitUrl
          }}
        />
      </div>
    );
  }

  // Show Token Generator if activated
  if (isTokenGenerator) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <TokenGenerator onBack={handleBackFromTokenGenerator} />
      </div>
    );
  }

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
              {/* N8N Webhook - Hidden but kept for easy restoration */}
              {/* To restore N8N: Uncomment this block
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
              */}

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  "border-border hover:border-primary/50"
                )}
                onClick={() => setIsTokenGenerator(true)}
              >
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">Generate Access Token</div>
                    <div className="text-sm text-muted-foreground">Create authentication tokens for API access</div>
                  </div>
                </div>
                <Badge variant="outline">
                  Auth
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
                onClick={() => updateConfig({ mode: "tenten-video", threadId: null })}
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

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "tenten-exam" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "tenten-exam", threadId: null })}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="font-medium">Connect to TenTen Exam Mode</div>
                    <div className="text-sm text-muted-foreground">FastAPI service with exam content support</div>
                  </div>
                </div>
                <Badge variant={config.mode === "tenten-exam" ? "default" : "outline"}>
                  Exam
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  "border-border hover:border-primary/50"
                )}
                onClick={() => setIsExamExplanation(true)}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-teal-500" />
                  <div>
                    <div className="font-medium">TenTen Exam Question Explanation Mode</div>
                    <div className="text-sm text-muted-foreground">Get detailed explanations for exam questions</div>
                  </div>
                </div>
                <Badge variant="outline">
                  Explanation
                </Badge>
              </div>

              <div 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  config.mode === "tenten-vectorize" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => updateConfig({ mode: "tenten-vectorize", threadId: null, gitEndpoint: "stage", authorizationToken: getVectorizeServiceKey("stage") })}
              >
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-indigo-500" />
                  <div>
                    <div className="font-medium">TenTen Knowledge Base</div>
                    <div className="text-sm text-muted-foreground">Vectorize and index academic documents</div>
                  </div>
                </div>
                <Badge variant={config.mode === "tenten-vectorize" ? "default" : "outline"}>
                  Vectorize
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
                    onClick={() => updateConfig({ gitEndpoint: "prod", customGitUrl: undefined, threadId: null })}
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
                    onClick={() => updateConfig({ gitEndpoint: "stage", customGitUrl: undefined, threadId: null })}
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
                    onClick={() => updateConfig({ gitEndpoint: "local", customGitUrl: undefined, threadId: null })}
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
                <div className="flex gap-2">
                  <Select
                    value={config.threadId !== null ? config.threadId.toString() : ""}
                    onValueChange={(value) => updateConfig({ threadId: parseInt(value) })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue>
                        {config.threadId !== null
                          ? (getLabelFromThreadId(config.threadId, config.gitEndpoint) || config.threadId) + ` (ID: ${config.threadId})`
                          : "Not set"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {getThreadOptions(config.gitEndpoint).map((option) => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          {option.label} (ID: {option.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="thread-id"
                    type="number"
                    placeholder="Custom"
                    value={config.threadId !== null ? String(config.threadId) : ""}
                    onChange={(e) => updateConfig({ 
                      threadId: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a subject or enter a custom thread ID. Changes sync with subject selector.
                </p>
              </div>

              {/* Segment ID */}
              <div className="space-y-2">
                <Label htmlFor="segment-id">Segment ID</Label>
                <div className="flex gap-2">
                  <Select
                    value={config.segmentId !== null ? config.segmentId.toString() : "10"}
                    onValueChange={(value) => updateConfig({ segmentId: parseInt(value) })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue>
                        {config.segmentId !== null
                          ? `${getSegmentIdLabel(config.segmentId)} (ID: ${config.segmentId})`
                          : "HSC (ID: 10)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">Class 6 (ID: 6)</SelectItem>
                      <SelectItem value="7">Class 7 (ID: 7)</SelectItem>
                      <SelectItem value="8">Class 8 (ID: 8)</SelectItem>
                      <SelectItem value="9">SSC (ID: 9)</SelectItem>
                      <SelectItem value="10">HSC (ID: 10)</SelectItem>
                      <SelectItem value="101">SSC (ID: 101)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="segment-id"
                    type="number"
                    placeholder="Custom"
                    value={config.segmentId !== null ? String(config.segmentId) : "10"}
                    onChange={(e) => updateConfig({ 
                      segmentId: e.target.value ? parseInt(e.target.value) : 10 
                    })}
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a segment or enter a custom segment ID. Will be sent as: {config.segmentId !== null ? config.segmentId : 10}
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
                    onClick={() => updateConfig({ gitEndpoint: "prod", customGitUrl: undefined, threadId: 1 })}
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
                    onClick={() => updateConfig({ gitEndpoint: "stage", customGitUrl: undefined, threadId: 7 })}
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
                    onClick={() => updateConfig({ gitEndpoint: "local", customGitUrl: undefined, threadId: 7 })}
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

              {/* Thread ID (Video mode: not used) */}
              <div className="space-y-2">
                <Label htmlFor="video-thread-id">Thread ID</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="video-thread-id"
                    placeholder="Not used (sent as null)"
                    value={"null"}
                    disabled
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Thread ID is not used in Video mode and will be sent as null.
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

          {/* Configuration for TenTen Exam mode */}
          {config.mode === "tenten-exam" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <Label className="text-base font-medium">Exam Mode Configuration</Label>
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
                    onClick={() => updateConfig({ gitEndpoint: "prod", customGitUrl: undefined, threadId: 1 })}
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
                    onClick={() => updateConfig({ gitEndpoint: "stage", customGitUrl: undefined, threadId: 7 })}
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
                    onClick={() => updateConfig({ gitEndpoint: "local", customGitUrl: undefined, threadId: 7 })}
                  >
                    <Badge variant={config.gitEndpoint === "local" ? "default" : "outline"}>
                      Local
                    </Badge>
                  </div>
                </div>
              </div>

              {/* API URL (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="exam-git-url">API Endpoint URL</Label>
                <Input
                  id="exam-git-url"
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
                <Label htmlFor="exam-auth-token">Authorization Token</Label>
                <Textarea
                  id="exam-auth-token"
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
                <Label htmlFor="exam-session-id">Session ID (Optional)</Label>
                <Input
                  id="exam-session-id"
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

              {/* Thread ID (Exam mode: not used) */}
              <div className="space-y-2">
                <Label htmlFor="exam-thread-id">Thread ID</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="exam-thread-id"
                    placeholder="Not used (sent as null)"
                    value={"null"}
                    disabled
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Thread ID is not used in Exam mode and will be sent as null.
                </p>
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label htmlFor="exam-content-type">Content Type</Label>
                <Input
                  id="exam-content-type"
                  placeholder="e.g., question"
                  value={config.contentType || ""}
                  onChange={(e) => updateConfig({ 
                    contentType: e.target.value.trim() || null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Type of content (default: question)
                </p>
              </div>

              {/* Content ID - Required for Exam Mode */}
              <div className="space-y-2">
                <Label htmlFor="exam-content-id">Content ID <span className="text-red-500">*</span></Label>
                <Input
                  id="exam-content-id"
                  placeholder="e.g., 694263f702cacda484dd8eb1"
                  value={config.contentId || ""}
                  onChange={(e) => updateConfig({ 
                    contentId: e.target.value.trim() || null 
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Identifier for the exam content.
                </p>
              </div>

              {/* Exam ID - Required for Exam Mode */}
              <div className="space-y-2">
                <Label htmlFor="exam-id">Exam ID <span className="text-red-500">*</span></Label>
                <Input
                  id="exam-id"
                  placeholder="e.g., 6942623902cacda484dd8d81"
                  value={config.examId || ""}
                  onChange={(e) => updateConfig({ 
                    examId: e.target.value.trim() || null 
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Identifier for the exam.
                </p>
              </div>

              {/* Exam Session ID - Required for Exam Mode */}
              <div className="space-y-2">
                <Label htmlFor="exam-session-id-field">Exam Session ID <span className="text-red-500">*</span></Label>
                <Input
                  id="exam-session-id-field"
                  placeholder="e.g., 694263f702cacda484dd8e9e"
                  value={config.examSessionId || ""}
                  onChange={(e) => updateConfig({ 
                    examSessionId: e.target.value.trim() || null 
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Identifier for the exam session.
                </p>
              </div>

              {/* Segment ID */}
              <div className="space-y-2">
                <Label htmlFor="exam-segment-id">Segment ID (Optional)</Label>
                <Input
                  id="exam-segment-id"
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

          {/* Configuration for TenTen Vectorize mode */}
          {config.mode === "tenten-vectorize" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <Label className="text-base font-medium">Knowledge Base Vectorization</Label>
              </div>

              {/* API Endpoint Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose API Endpoint</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2",
                      "border-border opacity-50"
                    )}
                  >
                    <Badge variant="outline">
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
                    onClick={() => updateConfig({ gitEndpoint: "stage", customGitUrl: undefined, authorizationToken: getVectorizeServiceKey("stage") })}
                  >
                    <Badge variant={config.gitEndpoint === "stage" ? "default" : "outline"}>
                      Stage
                    </Badge>
                  </div>
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border-2",
                      "border-border opacity-50"
                    )}
                  >
                    <Badge variant="outline">
                      Local
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Source Title (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-source-title">Source Title (Optional)</Label>
                <Input
                  id="vectorize-source-title"
                  placeholder="e.g., Mathematics Textbook"
                  value={config.vectorizeSourceTitle || ""}
                  onChange={(e) => updateConfig({ 
                    vectorizeSourceTitle: e.target.value.trim() || null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Title of the source document
                </p>
              </div>

              {/* Subject - Required */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-subject">Subject <span className="text-red-500">*</span></Label>
                <Input
                  id="vectorize-subject"
                  placeholder="e.g., Higher Math 2nd Paper"
                  value={config.vectorizeSubject || ""}
                  onChange={(e) => updateConfig({ 
                    vectorizeSubject: e.target.value.trim() || null 
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Subject name
                </p>
              </div>

              {/* Chapter - Required */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-chapter">Chapter <span className="text-red-500">*</span></Label>
                <Input
                  id="vectorize-chapter"
                  placeholder="e.g., অধ্যায় ১০: বিস্তার পরিমাপ ও সম্ভাবনা"
                  value={config.vectorizeChapter || ""}
                  onChange={(e) => updateConfig({ 
                    vectorizeChapter: e.target.value.trim() || null 
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Chapter name or identifier
                </p>
              </div>

              {/* Source Type - Required */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-source-type">Source Type <span className="text-red-500">*</span></Label>
                <Select
                  value={config.vectorizeSourceType || ""}
                  onValueChange={(value) => updateConfig({ vectorizeSourceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type">
                      {config.vectorizeSourceType || "Select source type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture_sheet">Lecture Sheet</SelectItem>
                    <SelectItem value="textbook">Textbook</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Type of document source
                </p>
              </div>

              {/* Grade - Required */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-grade">Grade <span className="text-red-500">*</span></Label>
                <Select
                  value={config.vectorizeGrade || ""}
                  onValueChange={(value) => updateConfig({ vectorizeGrade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade">
                      {config.vectorizeGrade || "Select grade"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class-6">Class 6</SelectItem>
                    <SelectItem value="class-7">Class 7</SelectItem>
                    <SelectItem value="class-8">Class 8</SelectItem>
                    <SelectItem value="ssc">SSC</SelectItem>
                    <SelectItem value="hsc">HSC</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> Academic grade level
                </p>
              </div>

              {/* File URL - Required */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-file-url">File URL <span className="text-red-500">*</span></Label>
                <Input
                  id="vectorize-file-url"
                  placeholder="https://s3.ap-southeast-1.amazonaws.com/..."
                  value={config.vectorizeFileUrl || ""}
                  onChange={(e) => updateConfig({ 
                    vectorizeFileUrl: e.target.value.trim() || null 
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> URL to the PDF file to be vectorized
                </p>
              </div>

              {/* Topics - Required */}
              <div className="space-y-2">
                <Label htmlFor="vectorize-topics">Topics <span className="text-red-500">*</span></Label>
                <Textarea
                  id="vectorize-topics"
                  placeholder="Enter topics separated by commas or new lines"
                  value={config.vectorizeTopics.join("\n")}
                  onChange={(e) => {
                    const topics = e.target.value
                      .split(/[\n,]+/)
                      .map(t => t.trim())
                      .filter(t => t.length > 0);
                    updateConfig({ vectorizeTopics: topics });
                  }}
                  className="min-h-[120px]"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">Required:</span> List of topics covered (one per line or comma-separated)
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
