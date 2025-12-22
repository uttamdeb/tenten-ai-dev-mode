import { useState } from "react";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { GitEndpoint } from "./SettingsPanel";

interface ExamExplanationProps {
  onBack: () => void;
  initialConfig: {
    questionId: string | null;
    gitEndpoint: GitEndpoint;
    authorizationToken: string;
  };
}

interface ExplanationResponse {
  status: number;
  message: string;
  errors: any[];
  data: {
    explanation: string;
  };
}

const getExplanationUrl = (endpoint: GitEndpoint): string => {
  switch (endpoint) {
    case "prod":
      return "https://api.10minuteschool.com/tenten-ai-service/api/v1/contents/question-explanation";
    case "stage":
      return "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/contents/question-explanation";
    case "local":
      return "http://localhost:8000/api/v1/contents/question-explanation";
  }
};

export function ExamExplanation({ onBack, initialConfig }: ExamExplanationProps) {
  const [endpoint, setEndpoint] = useState<GitEndpoint>(initialConfig.gitEndpoint);
  const [questionId, setQuestionId] = useState(initialConfig.questionId || "");
  const [authToken, setAuthToken] = useState(initialConfig.authorizationToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ExplanationResponse | null>(null);

  const handleGenerate = async () => {
    if (!questionId) {
      setError("Question ID is required");
      return;
    }

    if (!authToken) {
      setError("Authorization token is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const apiResponse = await fetch(getExplanationUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`
        },
        body: JSON.stringify({
          question_id: questionId
        })
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.message || `HTTP error! status: ${apiResponse.status}`);
      }

      if (data.status !== 200) {
        throw new Error(data.message || "Failed to get explanation");
      }

      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate explanation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Exam Question Explanation
          </CardTitle>
          <CardDescription>
            Get detailed explanations for exam questions
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
        </div>

        {/* API URL Display */}
        <div className="space-y-2">
          <Label>API Endpoint URL</Label>
          <Input
            value={getExplanationUrl(endpoint)}
            disabled
            className="font-mono text-sm"
          />
        </div>

        {/* Authorization Token */}
        <div className="space-y-2">
          <Label htmlFor="auth-token">Authorization Token</Label>
          <Input
            id="auth-token"
            type="password"
            placeholder="Enter your JWT authorization token..."
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            disabled={isLoading}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            JWT token for authentication with the service
          </p>
        </div>

        {/* Question ID */}
        <div className="space-y-2">
          <Label htmlFor="question-id">Question ID <span className="text-red-500">*</span></Label>
          <Input
            id="question-id"
            placeholder="e.g., 3370"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            <span className="text-red-500">Required:</span> Identifier for the question to explain.
          </p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !questionId || !authToken}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Explanation"
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Response Display */}
        {response && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium text-green-600">
                ✓ Explanation Generated Successfully
              </Label>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant="default">{response.status}</Badge>
                <span className="text-sm text-muted-foreground">{response.message}</span>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Explanation</Label>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {response.data.explanation}
                </p>
              </div>
            </div>

            {/* Errors (if any) */}
            {response.errors && response.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-destructive">Errors</Label>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <pre className="text-xs text-destructive overflow-auto">
                    {JSON.stringify(response.errors, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
