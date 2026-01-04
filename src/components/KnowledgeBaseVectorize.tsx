import { useState } from "react";
import { Database, ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KnowledgeBaseVectorizeProps {
  onBack: () => void;
}

type EndpointMode = "prod" | "stage" | "local";

interface VectorizeConfig {
  endpointMode: EndpointMode;
  customEndpoint: string;
  serviceKey: string;
  sourceTitle: string;
  subject: string;
  chapter: string;
  sourceType: string;
  grade: string;
  fileUrl: string;
  topics: string[];
}

interface VectorizeResponse {
  status: number;
  message: string;
  data?: any;
  errors?: any[];
}

const getEndpointUrl = (mode: EndpointMode): string => {
  switch (mode) {
    case "prod":
      return "https://api.10minuteschool.com/tenten-ai-service/api/v1/academic-documents/vectorize";
    case "stage":
      return "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/academic-documents/vectorize";
    case "local":
      return "http://localhost:8000/api/v1/academic-documents/vectorize";
  }
};

const getServiceKey = (mode: EndpointMode): string => {
  if (mode === "prod") {
    return "base64:ZFF0d6f47cfw5ICllJVL8p+D2IoZw+8tQaCq6RSQsVo=";
  }
  return "tenms_stage_service_key";
};

export function KnowledgeBaseVectorize({ onBack }: KnowledgeBaseVectorizeProps) {
  const [config, setConfig] = useState<VectorizeConfig>({
    endpointMode: "stage",
    customEndpoint: getEndpointUrl("stage"),
    serviceKey: getServiceKey("stage"),
    sourceTitle: "",
    subject: "",
    chapter: "",
    sourceType: "",
    grade: "",
    fileUrl: "",
    topics: []
  });

  const [newTopic, setNewTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VectorizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = (updates: Partial<VectorizeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleEndpointModeChange = (mode: EndpointMode) => {
    const serviceKey = mode === "prod" 
      ? "base64:ZFF0d6f47cfw5ICllJVL8p+D2IoZw+8tQaCq6RSQsVo=" 
      : "tenms_stage_service_key";
    
    updateConfig({
      endpointMode: mode,
      customEndpoint: getEndpointUrl(mode),
      serviceKey: serviceKey
    });
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      updateConfig({
        topics: [...config.topics, newTopic.trim()]
      });
      setNewTopic("");
    }
  };

  const removeTopic = (index: number) => {
    updateConfig({
      topics: config.topics.filter((_, i) => i !== index)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopic();
    }
  };

  const validateForm = (): string | null => {
    if (!config.subject.trim()) return "Subject is required";
    if (!config.chapter.trim()) return "Chapter is required";
    if (!config.sourceType.trim()) return "Source Type is required";
    if (!config.grade.trim()) return "Grade is required";
    if (!config.fileUrl.trim()) return "File URL is required";
    if (config.topics.length === 0) return "At least one topic is required";
    return null;
  };

  const handleVectorize = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: any = {
        subject: config.subject,
        chapter: config.chapter,
        source_type: config.sourceType,
        grade: config.grade,
        file_url: config.fileUrl,
        topics: config.topics
      };

      // Only add source_title if it's not empty
      if (config.sourceTitle.trim()) {
        payload.source_title = config.sourceTitle;
      }

      console.log('Sending vectorization request:', {
        endpoint: config.customEndpoint,
        payload
      });

      const response = await fetch(config.customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenms-service-key': config.serviceKey
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || `HTTP error! status: ${response.status}`);
        setResult(data);
      }
    } catch (err: any) {
      console.error('Error during vectorization:', err);
      setError(err.message || "Failed to vectorize document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            TenTen Knowledge Base
          </CardTitle>
          <CardDescription>
            Vectorize academic documents for the knowledge base
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Endpoint Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">API Endpoint</Label>
          <div className="grid grid-cols-3 gap-2">
            <div 
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-not-allowed opacity-50",
                config.endpointMode === "prod"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
              title="Production endpoint is currently disabled"
            >
              <Badge variant={config.endpointMode === "prod" ? "default" : "outline"}>
                Prod
              </Badge>
            </div>
            <div 
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                config.endpointMode === "stage" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleEndpointModeChange("stage")}
            >
              <Badge variant={config.endpointMode === "stage" ? "default" : "outline"}>
                Stage
              </Badge>
            </div>
            <div 
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-not-allowed opacity-50",
                config.endpointMode === "local"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
              title="Local endpoint is currently disabled"
            >
              <Badge variant={config.endpointMode === "local" ? "default" : "outline"}>
                Local
              </Badge>
            </div>
          </div>
        </div>

        {/* API URL */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-url">API Endpoint URL</Label>
          <Input
            id="endpoint-url"
            value={config.customEndpoint}
            onChange={(e) => updateConfig({ customEndpoint: e.target.value })}
            className="font-mono text-sm"
            placeholder="Enter API endpoint URL"
          />
          <p className="text-xs text-muted-foreground">
            Default: {getEndpointUrl(config.endpointMode)}
          </p>
        </div>

        {/* Source Title (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="source-title">Source Title <span className="text-muted-foreground">(Optional)</span></Label>
          <Input
            id="source-title"
            value={config.sourceTitle}
            onChange={(e) => updateConfig({ sourceTitle: e.target.value })}
            placeholder="e.g., HSC Higher Math Lecture Sheet"
          />
        </div>

        {/* Subject (Required) */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
          <Input
            id="subject"
            value={config.subject}
            onChange={(e) => updateConfig({ subject: e.target.value })}
            placeholder="e.g., Higher Math 2nd Paper"
            required
          />
        </div>

        {/* Chapter (Required) */}
        <div className="space-y-2">
          <Label htmlFor="chapter">Chapter <span className="text-red-500">*</span></Label>
          <Input
            id="chapter"
            value={config.chapter}
            onChange={(e) => updateConfig({ chapter: e.target.value })}
            placeholder="e.g., অধ্যায় ১০: বিস্তার পরিমাপ ও সম্ভাবনা"
            required
          />
        </div>

        {/* Source Type (Required) */}
        <div className="space-y-2">
          <Label htmlFor="source-type">Source Type <span className="text-red-500">*</span></Label>
          <Select 
            value={config.sourceType} 
            onValueChange={(value) => updateConfig({ sourceType: value })}
          >
            <SelectTrigger id="source-type">
              <SelectValue placeholder="Select source type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lecture_sheet">Lecture Sheet</SelectItem>
              <SelectItem value="textbook">Textbook</SelectItem>
              <SelectItem value="reference_book">Reference Book</SelectItem>
              <SelectItem value="exam_paper">Exam Paper</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grade (Required) */}
        <div className="space-y-2">
          <Label htmlFor="grade">Grade <span className="text-red-500">*</span></Label>
          <Select 
            value={config.grade} 
            onValueChange={(value) => updateConfig({ grade: value })}
          >
            <SelectTrigger id="grade">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class-6">Class 6</SelectItem>
              <SelectItem value="class-7">Class 7</SelectItem>
              <SelectItem value="class-8">Class 8</SelectItem>
              <SelectItem value="ssc">SSC</SelectItem>
              <SelectItem value="hsc">HSC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File URL (Required) */}
        <div className="space-y-2">
          <Label htmlFor="file-url">File URL <span className="text-red-500">*</span></Label>
          <Input
            id="file-url"
            value={config.fileUrl}
            onChange={(e) => updateConfig({ fileUrl: e.target.value })}
            placeholder="e.g., https://s3.ap-southeast-1.amazonaws.com/cdn.10minuteschool.com/..."
            required
          />
          <p className="text-xs text-muted-foreground">
            Full URL to the PDF or document file
          </p>
        </div>

        {/* Topics (Required) */}
        <div className="space-y-2">
          <Label htmlFor="topics">Topics <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Input
              id="topics"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a topic and press Enter or click Add"
            />
            <Button type="button" onClick={addTopic} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {config.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {config.topics.map((topic, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {topic}
                  <button
                    onClick={() => removeTopic(index)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove topic: ${topic}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Add at least one topic. Press Enter or click Add to add each topic.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {result && !error && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Vectorization successful!</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            Back to Settings
          </Button>
          <Button 
            onClick={handleVectorize} 
            disabled={isLoading}
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vectorizing...
              </>
            ) : (
              "Vectorize"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
