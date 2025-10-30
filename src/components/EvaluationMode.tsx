import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, PlayCircle, FlaskConical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import tentenIcon from "@/assets/tenten-icon.png";

type EndpointMode = "prod" | "stage" | "local";

interface Metric {
  name: string;
}

interface EvaluationConfig {
  endpointMode: EndpointMode;
  customEndpoint: string;
  serviceKey: string;
  experimentName: string;
  datasetName: string;
  metrics: string[];
  customMetrics: string;
  useAgent: boolean;
}

interface EvaluationResponse {
  status: number;
  message: string;
  data: {
    success: boolean;
    experiment_name: string;
    message: string;
    results: {
      status: string;
      task_id: string;
      dataset_name: string;
      metrics_used: string[];
      note: string;
    };
    error: null | string;
  };
}

interface EvaluationModeProps {
  onBack: () => void;
}

const AVAILABLE_METRICS = [
  "Hallucination",
  "Equals",
  "RegexMatch",
  "Contains",
  "IsJson",
  "LevenshteinRatio",
  "ContextPrecision",
  "ContextRecall",
  "AnswerRelevance",
  "Moderation",
  "Custom"
];

const getEndpointUrl = (mode: EndpointMode): string => {
  switch (mode) {
    case "prod":
      return "https://api.10minuteschool.com/tenten-ai-service/api/v1/evaluations/run";
    case "stage":
      return "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/evaluations/run";
    case "local":
      return "http://localhost:8000/api/v1/evaluations/run";
  }
};

const getCurrentDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
};

export function EvaluationMode({ onBack }: EvaluationModeProps) {
  const [config, setConfig] = useState<EvaluationConfig>({
    endpointMode: "stage",
    customEndpoint: getEndpointUrl("stage"),
    serviceKey: "tenms_stage_service_key",
    experimentName: `supersolve_eval_run_${getCurrentDate()}`,
    datasetName: "TenTen Ground Truth v1",
    metrics: [],
    customMetrics: "",
    useAgent: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = (updates: Partial<EvaluationConfig>) => {
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

  const toggleMetric = (metric: string) => {
    setConfig(prev => {
      const isSelected = prev.metrics.includes(metric);
      if (isSelected) {
        return { ...prev, metrics: prev.metrics.filter(m => m !== metric) };
      } else {
        return { ...prev, metrics: [...prev.metrics, metric] };
      }
    });
  };

  const handleInitiateEval = async () => {
    // Validate at least one metric is selected
    const finalMetrics = config.metrics.includes("Custom") && config.customMetrics.trim()
      ? [...config.metrics.filter(m => m !== "Custom"), ...config.customMetrics.split(',').map(m => m.trim()).filter(Boolean)]
      : config.metrics.filter(m => m !== "Custom");

    if (finalMetrics.length === 0) {
      setError("Please select at least one metric");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        experiment_name: config.experimentName,
        dataset_name: config.datasetName,
        metrics: finalMetrics.map(name => ({ name })),
        use_agent: config.useAgent
      };

      console.log('Sending evaluation request:', {
        endpoint: config.customEndpoint,
        payload
      });

      const response = await fetch(config.customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenms-Service-Key': config.serviceKey
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || `Failed to initiate evaluation (Status: ${response.status})`);
      }
    } catch (err) {
      console.error('Evaluation request error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to fetch')) {
        setError(`Network error: Cannot connect to ${config.customEndpoint}. Please check:\n1. The service is running\n2. CORS is enabled on the server\n3. The endpoint URL is correct`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If we have results, show the results view
  if (result) {
    return (
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <img src={tentenIcon} alt="TenTen AI" className="h-6 w-6" />
              Evaluation Queued Successfully
            </CardTitle>
            <CardDescription>
              Your evaluation has been queued and is being processed
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onBack}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Messages */}
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <p className="font-medium text-green-900 dark:text-green-100">
                {result.message}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {result.data.message}
              </p>
            </div>
          </div>

          <Separator />

          {/* Task Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Task ID</Label>
              <div className="p-3 rounded-md bg-muted font-mono text-sm">
                {result.data.results.task_id}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Experiment Name</Label>
              <div className="p-3 rounded-md bg-muted font-mono text-sm">
                {result.data.experiment_name}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Dataset</Label>
              <div className="p-3 rounded-md bg-muted font-mono text-sm">
                {result.data.results.dataset_name}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Metrics Used</Label>
              <div className="flex flex-wrap gap-2">
                {result.data.results.metrics_used.map((metric, idx) => (
                  <Badge key={idx} variant="secondary">
                    {metric}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Badge variant="outline" className="capitalize">
                {result.data.results.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={onBack}>
              Back to Settings
            </Button>
            <Button
              onClick={() => window.open('https://opik.10minuteschool.com/default/experiments', '_blank')}
              className="gap-2"
            >
              Show Results in Opik
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Configuration view
  return (
    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <img src={tentenIcon} alt="TenTen AI" className="h-6 w-6" />
            <FlaskConical className="h-5 w-5" />
            Evaluation Mode
          </CardTitle>
          <CardDescription>
            Configure and run TenTen AI evaluation experiments
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onBack}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* API Endpoint Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">API Endpoint</Label>
          <div className="grid grid-cols-3 gap-2">
            <div 
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                config.endpointMode === "prod" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleEndpointModeChange("prod")}
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
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all",
                config.endpointMode === "local" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleEndpointModeChange("local")}
            >
              <Badge variant={config.endpointMode === "local" ? "default" : "outline"}>
                Local
              </Badge>
            </div>
          </div>
          <Input
            value={config.customEndpoint}
            onChange={(e) => updateConfig({ customEndpoint: e.target.value })}
            className="font-mono text-sm"
            placeholder="Enter API endpoint URL"
          />
        </div>

        <Separator />

        {/* Service Key */}
        <div className="space-y-2">
          <Label htmlFor="service-key">Service Key</Label>
          <Input
            id="service-key"
            value={config.serviceKey}
            onChange={(e) => updateConfig({ serviceKey: e.target.value })}
            placeholder="Enter X-Tenms-Service-Key"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Authentication key for the evaluation service
          </p>
        </div>

        {/* Experiment Name */}
        <div className="space-y-2">
          <Label htmlFor="experiment-name">Experiment Name</Label>
          <Input
            id="experiment-name"
            value={config.experimentName}
            onChange={(e) => updateConfig({ experimentName: e.target.value })}
            placeholder="e.g., physics_hsc_evaluation_v1"
          />
          <p className="text-xs text-muted-foreground">
            Follow specific naming scheme provided (e.g., supersolve_eval_run_YYYY_MM_DD)
          </p>
        </div>

        {/* Dataset Name */}
        <div className="space-y-2">
          <Label htmlFor="dataset-name">Dataset Name</Label>
          <Input
            id="dataset-name"
            value={config.datasetName}
            onChange={(e) => updateConfig({ datasetName: e.target.value })}
            placeholder="TenTen Ground Truth v1"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            You can find the exact dataset name from{" "}
            <a 
              href="https://opik.10minuteschool.com/default/datasets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Opik Console
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        {/* Metrics Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Metrics</Label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_METRICS.map((metric) => (
              <div key={metric} className="flex items-center space-x-2">
                <Checkbox
                  id={`metric-${metric}`}
                  checked={config.metrics.includes(metric)}
                  onCheckedChange={() => toggleMetric(metric)}
                />
                <label
                  htmlFor={`metric-${metric}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {metric}
                </label>
              </div>
            ))}
          </div>
          
          {/* Custom Metrics Input */}
          {config.metrics.includes("Custom") && (
            <div className="space-y-2">
              <Label htmlFor="custom-metrics">Custom Metrics (comma-separated)</Label>
              <Input
                id="custom-metrics"
                value={config.customMetrics}
                onChange={(e) => updateConfig({ customMetrics: e.target.value })}
                placeholder="e.g., CustomMetric1, CustomMetric2"
              />
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Select at least one metric to evaluate
          </p>
        </div>

        {/* Use Agent Toggle (Disabled) */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="use-agent" className="text-base">Use Agent</Label>
            <p className="text-xs text-muted-foreground">
              Agent mode is enabled by default
            </p>
          </div>
          <Switch
            id="use-agent"
            checked={config.useAgent}
            disabled
            className="opacity-50"
          />
        </div>

        <Separator />

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-900 dark:text-red-100 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={onBack} disabled={isLoading}>
            Back to Settings
          </Button>
          <Button 
            onClick={handleInitiateEval} 
            disabled={isLoading || config.metrics.length === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>Processing...</>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Initiate Eval Queue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
