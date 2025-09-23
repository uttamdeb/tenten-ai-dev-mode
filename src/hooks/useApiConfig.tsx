import { useState, useEffect } from "react";
import { ApiConfiguration, ApiMode } from "@/components/SettingsPanel";

const STORAGE_KEY = "tenten-ai-api-config";

const DEFAULT_CONFIG: ApiConfiguration = {
  mode: "n8n",
  authorizationToken: "",
  sessionId: null,
  threadId: 1,
  remoteGitUrl: "https://local-api.10minuteschool.net/tenten-ai-service/api/v1/messages",
  localGitUrl: "http://localhost:8000/api/v1/messages"
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
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
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
    return mode === "remote-git" || mode === "local-git";
  };

  const getApiUrl = () => {
    switch (config.mode) {
      case "remote-git":
        return config.remoteGitUrl;
      case "local-git":
        return config.localGitUrl;
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
