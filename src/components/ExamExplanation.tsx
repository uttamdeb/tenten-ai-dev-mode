import { useState } from "react";
import { BookOpen, ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GitEndpoint } from "./SettingsPanel";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ExamExplanationProps {
  onBack: () => void;
  initialConfig: {
    questionId: string | null;
    gitEndpoint: GitEndpoint;
    authorizationToken: string;
    customGitUrl?: string | null;
  };
}

interface ExplanationResponse {
  questionId: string;
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
  const [questionIds, setQuestionIds] = useState(initialConfig.questionId || "");
  const [authToken, setAuthToken] = useState(initialConfig.authorizationToken);
  const [customUrl, setCustomUrl] = useState<string>(initialConfig.customGitUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<ExplanationResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleGenerate = async () => {
    if (!questionIds.trim()) {
      setError("Question ID(s) are required");
      return;
    }

    if (!authToken) {
      setError("Authorization token is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponses([]);
    setCurrentIndex(0);

    // Parse question IDs (comma-separated or space-separated)
    const idList = questionIds
      .split(/[\s,]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (idList.length === 0) {
      setError("No valid question IDs provided");
      setIsLoading(false);
      return;
    }

    try {
      const results: ExplanationResponse[] = [];
      
      // Make API calls sequentially for each question ID
      for (const qId of idList) {
        try {
          const apiUrl = customUrl && customUrl.trim() !== "" ? customUrl : getExplanationUrl(endpoint);
          const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`
            },
            body: JSON.stringify({
              question_id: qId
            })
          });

          const data = await apiResponse.json();

          if (!apiResponse.ok) {
            results.push({
              questionId: qId,
              status: apiResponse.status,
              message: data.message || `HTTP error! status: ${apiResponse.status}`,
              errors: [data.message || "Request failed"],
              data: { explanation: "" }
            });
          } else if (data.status !== 200) {
            results.push({
              questionId: qId,
              status: data.status,
              message: data.message || "Failed to get explanation",
              errors: data.errors || [data.message || "Failed"],
              data: { explanation: "" }
            });
          } else {
            results.push({
              questionId: qId,
              ...data
            });
          }
        } catch (err: any) {
          results.push({
            questionId: qId,
            status: 0,
            message: "Error",
            errors: [err.message || "Failed to fetch"],
            data: { explanation: "" }
          });
        }
      }

      setResponses(results);
      if (results.length === 0) {
        setError("No explanations could be generated");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate explanations");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(responses.length - 1, prev + 1));
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

        {/* API URL (Editable) */}
        <div className="space-y-2">
          <Label>API Endpoint URL</Label>
          <Input
            value={customUrl && customUrl.trim() !== "" ? customUrl : getExplanationUrl(endpoint)}
            onChange={(e) => setCustomUrl(e.target.value)}
            disabled={isLoading}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">You can edit the endpoint URL. Leave empty to use default for selected environment.</p>
        </div>

        {/* Authorization Token */}
        <div className="space-y-2">
          <Label htmlFor="auth-token">Authorization Token</Label>
          <Textarea
            id="auth-token"
            placeholder="Enter your JWT authorization token..."
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            disabled={isLoading}
            className="min-h-[80px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            JWT token for authentication with the service
          </p>
        </div>

        {/* Question IDs */}
        <div className="space-y-2">
          <Label htmlFor="question-ids">Question ID(s) <span className="text-red-500">*</span></Label>
          <Input
            id="question-ids"
            placeholder="e.g., 3370 or 3370, 14748, 5522 (comma or space separated)"
            value={questionIds}
            onChange={(e) => setQuestionIds(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            <span className="text-red-500">Required:</span> Enter one or more question IDs (comma or space separated).
          </p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !questionIds.trim() || !authToken}
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

        {/* Response Display with Carousel */}
        {responses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-medium text-green-600">
                ✓ Explanations Generated Successfully
              </Label>
              {responses.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary">
                    {currentIndex + 1} / {responses.length}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === responses.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Current Response */}
            {responses[currentIndex] && (
              <div className="space-y-4">
                {/* Question ID Badge */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Question ID:</Label>
                  <Badge variant="outline" className="font-mono">
                    {responses[currentIndex].questionId}
                  </Badge>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={responses[currentIndex].status === 200 ? "default" : "destructive"}>
                      {responses[currentIndex].status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{responses[currentIndex].message}</span>
                  </div>
                </div>

                {/* Explanation - only show if successful */}
                {responses[currentIndex].data.explanation && (
                  <>
                    {/* Explanation */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Explanation</Label>
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {responses[currentIndex].data.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Explanation (Katex) */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Explanation (Katex)</Label>
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <MarkdownRenderer>
                          {responses[currentIndex].data.explanation}
                        </MarkdownRenderer>
                      </div>
                    </div>
                  </>
                )}

                {/* Errors (if any) */}
                {responses[currentIndex].errors && responses[currentIndex].errors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-destructive">Errors</Label>
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <pre className="text-xs text-destructive overflow-auto">
                        {JSON.stringify(responses[currentIndex].errors, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
