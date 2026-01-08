import { useState, useEffect } from "react";
import { ApiConfiguration, ApiMode, GitEndpoint } from "@/components/SettingsPanel";

const STORAGE_KEY = "tenten-ai-api-config";

const DEFAULT_CONFIG: ApiConfiguration = {
  mode: "tenten-git",
  authorizationToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzN2I1ZWQ0NmE2MzYzODU3MzNlZjJiZCIsImlzX2FkbWluIjpmYWxzZSwiY29udGFjdCI6IiIsImVtYWlsIjoiYWRtaW5AMTBtcy5jb20iLCJsb2dpbl90eXBlIjoiZW1haWwiLCJsb2dpbl9zb3VyY2UiOiIxMG1pbnNjaG9vbCIsImxvZ2luX3RhcmdldCI6IiIsImxvZ2luX2FzIjowLCJuYW1lIjoiYWRtaW5AMTBtcy5jb20iLCJpc19hY3RpdmUiOmZhbHNlLCJ2ZXJpZmllZCI6dHJ1ZSwiZGV2aWNlX2lkIjoiNjhlMGU0MTcyNTk2OTk1ODYxYjY1NWZkIiwiZGV2aWNlIjp7ImRldmljZV9pZCI6IjY4ZTBlNDE3MjU5Njk5NTg2MWI2NTVmZCIsIm1hY19pZCI6IiIsImRldmljZV9uYW1lIjoiQ2hyb21lIDEzOS4wLjAuMCIsImRldmljZV90eXBlIjoiYnJvd3NlciIsImRldmljZV9vcyI6IkludGVsIE1hYyBPUyBYIDEwXzE1XzciLCJwbGF0Zm9ybSI6IndlYiIsIm9yaWdpbiI6Imh0dHBzOi8vbG9jYWwuMTBtaW51dGVzY2hvb2wubmV0IiwiaXBfYWRkcmVzcyI6IjJhMDk6YmFjMTpiMDA6NTE4OjoyYTU6ZCJ9LCJ1c2VyX3N0YXR1cyI6IiIsImRhdGVfam9pbmVkIjoiMjAyMi0xMS0yMVQxMToxOTo0OC4yNTNaIiwidG9rZW5fdHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2MDE3MzcxOX0.PrEPG-t4WidhHXxhv28KKqYoc7vTDdb7NUFoJqEEysk",
  sessionId: null,
  threadId: 7, // Default to stage/local Physics thread ID
  gitEndpoint: "stage",
  contentType: null,
  contentId: null,
  segmentId: 10,
  examId: null,
  examSessionId: null,
  questionId: null
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

export const useApiConfig = () => {
  const [config, setConfig] = useState<ApiConfiguration>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        
        // Migrate old config format to new format
        let migratedConfig = { ...parsed };
        
        // If old mode exists, convert to new format
        if (parsed.mode === "prod-git") {
          migratedConfig.mode = "tenten-git";
          migratedConfig.gitEndpoint = "prod";
        } else if (parsed.mode === "remote-git") {
          migratedConfig.mode = "tenten-git";
          migratedConfig.gitEndpoint = "stage";
        } else if (parsed.mode === "local-git") {
          migratedConfig.mode = "tenten-git";
          migratedConfig.gitEndpoint = "local";
        }
        
        // Clean up old URL fields
        delete migratedConfig.prodGitUrl;
        delete migratedConfig.remoteGitUrl;
        delete migratedConfig.localGitUrl;
        
        setConfig({ ...DEFAULT_CONFIG, ...migratedConfig });
        
        // Save migrated config back to localStorage
        if (parsed.mode !== migratedConfig.mode) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedConfig));
        }
      }
    } catch (error) {
      console.error("Error loading API config:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save configuration to localStorage whenever it changes
  const updateConfig = (newConfig: ApiConfiguration) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error("Error saving API config:", error);
    }
  };

  const resetConfig = () => {
    updateConfig(DEFAULT_CONFIG);
  };

  const isGitMode = (mode: ApiMode) => {
    return mode === "tenten-git" || mode === "tenten-video" || mode === "tenten-exam";
};

  const getApiUrl = () => {
    switch (config.mode) {
      case "tenten-git":
      case "tenten-video":
      case "tenten-exam":
        return config.customGitUrl || getGitEndpointUrl(config.gitEndpoint);
      case "n8n":
      default:
        return "https://n8n-prod.10minuteschool.com/webhook/supersolve-ai-v1";
    }
  };

  const getAuthHeader = () => {
    if (isGitMode(config.mode)) {
      return {
        Authorization: config.authorizationToken.startsWith('Bearer ') 
          ? config.authorizationToken 
          : `Bearer ${config.authorizationToken}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'Content-Type': 'application/json'
    };
  };

  return {
    config,
    updateConfig,
    resetConfig,
    isLoaded,
    isGitMode: isGitMode(config.mode),
    getApiUrl,
    getAuthHeader
  };
};
