"use client";

import { useState } from "react";
import { Copy, Key, Plus, Shield, Check, Eye, EyeOff, Zap, CheckCircle2, XCircle, RefreshCw, Power, ExternalLink, Fingerprint } from "lucide-react";
import { verifyProviderApiKey } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface ProviderConfig {
  code: string;
  name: string;
  key: string;
  getKeyUrl: string;
  isActive: boolean;
  testStatus: "idle" | "testing" | "success" | "error";
  testMessage?: string;
  saved: boolean;
}

interface CustomerKey {
  id: string;
  name: string;
  publicKey: string;
  hash: string;
  environment: string;
  created: string;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const userId = user?.id || "usr_dev_active";
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [visibleProviderKeys, setVisibleProviderKeys] = useState<Record<string, boolean>>({});

  const [customerKeys, setCustomerKeys] = useState<CustomerKey[]>([
    {
      id: "key_1",
      name: "Default Dev Key",
      publicKey: "pk_live_default_key_01",
      hash: "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$...",
      environment: "Production",
      created: "Aug 20, 2026",
    },
    {
      id: "key_2",
      name: "Mobile App Staging Key",
      publicKey: "pk_test_mobile_stg_9988",
      hash: "$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$...",
      environment: "Staging",
      created: "Aug 20, 2026",
    },
  ]);

  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({
    gemini: {
      code: "gemini",
      name: "Google Gemini AI",
      key: "AIzaSyDevKey_Gemini_Sample_998877",
      getKeyUrl: "https://aistudio.google.com/app/apikey",
      isActive: true,
      testStatus: "success",
      testMessage: "Connection verified (Gemini 3.6 Flash / 3.5 Flash)",
      saved: true,
    },
    openai: {
      code: "openai",
      name: "OpenAI",
      key: "sk-proj-DevKey_OpenAI_Sample_112233",
      getKeyUrl: "https://platform.openai.com/api-keys",
      isActive: true,
      testStatus: "success",
      testMessage: "Connection verified (GPT-5.6 Luna / Terra)",
      saved: true,
    },
    anthropic: {
      code: "anthropic",
      name: "Anthropic Claude",
      key: "",
      getKeyUrl: "https://console.anthropic.com/settings/keys",
      isActive: false,
      testStatus: "idle",
      saved: false,
    },
    deepseek: {
      code: "deepseek",
      name: "DeepSeek AI",
      key: "",
      getKeyUrl: "https://platform.deepseek.com/api_keys",
      isActive: false,
      testStatus: "idle",
      saved: false,
    },
  });

  const handleGenerateKey = () => {
    const secret = `call_sk_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    setCreatedSecret(secret);

    const newKey: CustomerKey = {
      id: `key_${Date.now()}`,
      name: "Generated App Secret Key",
      publicKey: `pk_live_${Math.random().toString(36).substring(2, 10)}`,
      hash: "$argon2id$v=19$m=65536,t=3,p=4$...",
      environment: "Production",
      created: "Just now",
    };
    setCustomerKeys((prev) => [newKey, ...prev]);
  };

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const handleCopySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyPublicKey = (keyObj: CustomerKey) => {
    navigator.clipboard.writeText(keyObj.publicKey);
    setCopiedKeyId(keyObj.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleKeyChange = (code: string, newKey: string) => {
    setProviders((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        key: newKey,
        testStatus: "idle",
        testMessage: undefined,
        saved: false,
      },
    }));
  };

  const handleToggleVisibility = (code: string) => {
    setVisibleProviderKeys((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleToggleActive = (code: string) => {
    setProviders((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        isActive: !prev[code].isActive,
      },
    }));
  };

  const handleTestConnection = async (code: string) => {
    const p = providers[code];
    if (!p.key.trim()) return;

    setProviders((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        testStatus: "testing",
        testMessage: `Sending real live HTTP test request to ${p.name} endpoint...`,
      },
    }));

    try {
      const result = await verifyProviderApiKey({
        provider: code,
        apiKey: p.key.trim(),
      });

      if (result.valid) {
        setProviders((prev) => ({
          ...prev,
          [code]: {
            ...prev[code],
            testStatus: "success",
            testMessage: result.message,
            isActive: true,
          },
        }));
      } else {
        setProviders((prev) => ({
          ...prev,
          [code]: {
            ...prev[code],
            testStatus: "error",
            testMessage: result.message,
            saved: false,
          },
        }));
      }
    } catch (err: any) {
      setProviders((prev) => ({
        ...prev,
        [code]: {
          ...prev[code],
          testStatus: "error",
          testMessage: `Test error: ${err.message || "Failed to connect to verification server"}`,
          saved: false,
        },
      }));
    }
  };

  const handleSaveKey = (code: string) => {
    setProviders((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        saved: true,
      },
    }));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">API Credentials & Provider Keys</h1>
          <p className="text-xs opacity-75">Manage customer secret keys, user identity, and test encrypted AI provider credentials</p>
        </div>
        <button
          onClick={handleGenerateKey}
          className="px-4 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-bold text-xs shadow-lg shadow-[#e1b329]/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Secret API Key</span>
        </button>
      </div>

      {/* User Identity Banner Card */}
      <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#e1b329]/15 border border-[#e1b329]/30 text-[#e1b329]">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Account Identity</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                Admin / Owner
              </span>
            </div>
            <p className="text-xs opacity-80">Used for path routing in endpoint: <code className="text-[#e1b329] font-mono font-bold">POST /v1/call/{`{user_id}`}</code></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel border border-[#edd6bb]/20 rounded-xl px-3.5 py-1.5 font-mono text-xs text-[#e1b329] flex items-center gap-2">
            <span className="opacity-60 text-[11px]">User ID:</span>
            <span className="font-bold">{userId}</span>
          </div>

          <button
            onClick={handleCopyUserId}
            className="px-3.5 py-1.5 rounded-xl bg-[#e1b329]/15 hover:bg-[#e1b329]/25 text-[#8a715e] dark:text-[#edd6bb] border border-[#e1b329]/30 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {copiedUserId ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Copy User ID</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secret Key Modal Banner if Generated */}
      {createdSecret && (
        <div className="glass-panel p-6 rounded-2xl border border-[#ffb443]/40 bg-[#ffb443]/10 space-y-3">
          <div className="flex items-center gap-2 text-[#8a715e] dark:text-[#ffb443] font-bold text-sm">
            <Shield className="w-4 h-4 text-[#e1b329]" />
            <span>New API Secret Key Generated</span>
          </div>
          <p className="text-xs opacity-90">
            Please copy this key now. For security reasons, it will not be shown again. (Hashed with Argon2id on server)
          </p>
          <div className="flex items-center gap-2">
            <input
              type={showKey ? "text" : "password"}
              readOnly
              value={createdSecret}
              className="flex-1 glass-panel border border-[#edd6bb]/20 rounded-xl px-3.5 py-2 font-mono text-xs text-[#e1b329] focus:outline-none"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 rounded-xl glass-panel opacity-70 hover:opacity-100"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopySecret}
              className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              {copiedSecret ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSecret ? "Copied!" : "Copy Key"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Customer API Secret Keys Table */}
      <div className="glass-panel p-6 rounded-2xl border border-[#edd6bb]/20 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Key className="w-4 h-4 text-[#e1b329]" />
          <span>Customer App Secret Keys</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="opacity-75 border-b border-[#edd6bb]/20 bg-[#edd6bb]/10">
              <tr>
                <th className="py-2.5 px-3">Key Name</th>
                <th className="py-2.5 px-3">Public Key (`pk_live_...`)</th>
                <th className="py-2.5 px-3">Secret Key Hash</th>
                <th className="py-2.5 px-3">Environment</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edd6bb]/15">
              {customerKeys.map((item) => (
                <tr key={item.id} className="hover:bg-[#edd6bb]/10 transition-colors">
                  <td className="py-3 px-3 font-bold">{item.name}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-[#e1b329] font-bold">
                    <div className="flex items-center gap-2">
                      <span>{item.publicKey}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPublicKey(item)}
                        title="Copy Public Key"
                        className="p-1 rounded hover:bg-[#edd6bb]/15 opacity-75 hover:opacity-100 transition-colors"
                      >
                        {copiedKeyId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#e1b329]" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] opacity-60">{item.hash}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.environment === "Production"
                        ? "bg-[#e1b329]/15 text-[#8a715e] dark:text-[#ffb443] border-[#e1b329]/30"
                        : "bg-[#ffb443]/15 text-[#8a715e] dark:text-[#ffb443] border-[#ffb443]/30"
                    }`}>
                      {item.environment}
                    </span>
                  </td>
                  <td className="py-3 px-3 opacity-75">{item.created}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopyPublicKey(item)}
                      className="px-2.5 py-1 rounded-lg glass-panel hover:bg-[#e1b329]/15 text-xs font-bold flex items-center gap-1.5 ml-auto border border-[#edd6bb]/20 hover:border-[#e1b329]/40 transition-all"
                    >
                      {copiedKeyId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#e1b329]" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Encrypted AI Provider API Keys & Testing */}
      <div className="glass-panel p-6 rounded-2xl border border-[#edd6bb]/20 space-y-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>AI Provider API Keys (AES-256-GCM Encrypted & Tested)</span>
          </h2>
          <p className="text-xs opacity-75">
            Supply, test connection, and activate AI Provider credentials for execution
          </p>
        </div>

        <div className="space-y-4">
          {Object.values(providers).map((prov) => {
            const isVisible = visibleProviderKeys[prov.code] || false;
            return (
              <div
                key={prov.code}
                className={`p-5 rounded-2xl border transition-all ${
                  prov.isActive
                    ? "glass-panel border-[#edd6bb]/20"
                    : "opacity-75 glass-panel border-[#edd6bb]/10"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#edd6bb]/15 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">{prov.name}</span>
                    {prov.isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/25 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full opacity-60 text-[10px] font-medium border border-[#edd6bb]/20">
                        Inactive (Key Disabled)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Get API Key Direct Link */}
                    <a
                      href={prov.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#e1b329] hover:underline flex items-center gap-1 transition-colors glass-panel px-2.5 py-1 rounded-lg border border-[#e1b329]/30"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="w-3 h-3 text-[#e1b329]" />
                    </a>

                    <button
                      onClick={() => handleToggleActive(prov.code)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        prov.isActive
                          ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 hover:bg-emerald-600/30"
                          : "opacity-60 border border-[#edd6bb]/20 hover:opacity-100"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{prov.isActive ? "Enabled" : "Disabled"}</span>
                    </button>
                  </div>
                </div>

                {/* Input with Show/Hide Toggle & Test Connection Controls */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? "text" : "password"}
                        value={prov.key}
                        onChange={(e) => handleKeyChange(prov.code, e.target.value)}
                        className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#e1b329]"
                        placeholder={`Enter ${prov.name} API Key...`}
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(prov.code)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-colors"
                        title={isVisible ? "Hide API Key" : "Show API Key"}
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Test Connection Button */}
                    <button
                      onClick={() => handleTestConnection(prov.code)}
                      disabled={!prov.key.trim() || prov.testStatus === "testing"}
                      className="px-4 py-2 rounded-xl bg-[#8a715e] hover:bg-[#8b7e6d] text-slate-100 dark:text-[#edd6bb] disabled:opacity-40 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                    >
                      {prov.testStatus === "testing" ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#e1b329]" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-[#e1b329]" />
                      )}
                      <span>{prov.testStatus === "testing" ? "Testing..." : "Test Connection"}</span>
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveKey(prov.code)}
                      disabled={prov.testStatus !== "success"}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        prov.testStatus === "success"
                          ? "bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 shadow-lg shadow-[#e1b329]/20"
                          : "opacity-40 cursor-not-allowed border border-[#edd6bb]/20"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{prov.saved ? "Key Saved" : "Save Key"}</span>
                    </button>
                  </div>

                  {/* Connection Status Feedback Banner */}
                  {prov.testMessage && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-semibold ${
                        prov.testStatus === "success"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                          : prov.testStatus === "error"
                          ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30"
                          : "glass-panel border border-[#edd6bb]/20"
                      }`}
                    >
                      {prov.testStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      {prov.testStatus === "error" && <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
                      <span>{prov.testMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
