/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import React from "react";
import { AlertTriangle, Info, Clock, Shield, AlertOctagon } from "lucide-react";
import { Alert } from "../App";
import { useLanguage } from "../contexts/LanguageContext";

interface AlertSystemProps {
  alerts: Alert[];
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ alerts }) => {
  const { t } = useLanguage();
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "danger":
        return <AlertOctagon className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Shield className="h-5 w-5 text-green-600" />;
    }
  };

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "danger":
        return "border-red-300 bg-red-50";
      case "warning":
        return "border-yellow-300 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-green-200 bg-green-50";
    }
  };

  const getAlertLevel = (type: Alert["type"]): string => {
    switch (type) {
      case "danger":
        return t('alert.l3');
      case "warning":
        return t('alert.l2');
      case "info":
        return t('alert.l1');
      default:
        return t('alert.safe');
    }
  };

  const getAlertLevelBadge = (type: Alert["type"]) => {
    switch (type) {
      case "danger":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-800">
            L3
          </span>
        );
      case "warning":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-200 text-yellow-800">
            L2
          </span>
        );
      case "info":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-200 text-blue-800">
            L1
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return t('alert.just_now');
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const dangerCount = alerts.filter((a) => a.type === "danger").length;
  const warningCount = alerts.filter((a) => a.type === "warning").length;
  const infoCount = alerts.filter((a) => a.type === "info").length;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <div>
              <h3 className="text-lg font-semibold">{t('alert.title')}</h3>
              <p className="text-xs text-red-200">
                {t('alert.maritime')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dangerCount > 0 && (
              <span className="bg-red-900 px-2 py-1 rounded text-xs font-bold">
                {dangerCount} L3
              </span>
            )}
            {warningCount > 0 && (
              <span className="bg-yellow-700 px-2 py-1 rounded text-xs font-bold">
                {warningCount} L2
              </span>
            )}
            {infoCount > 0 && (
              <span className="bg-blue-700 px-2 py-1 rounded text-xs font-bold">
                {infoCount} L1
              </span>
            )}
            <span className="bg-red-800 px-2 py-1 rounded text-sm font-medium">
              {alerts.length} total
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            {t('alert.l3_violation')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            {t('alert.l2_high_risk')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            {t('alert.l1_advisory')}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
            <p className="font-medium text-green-700">{t('alert.clear')}</p>
            <p className="text-sm mt-1">
              {t('alert.safe_ops')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-3 ${getAlertStyles(alert.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="mr-2 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getAlertLevelBadge(alert.type)}
                        <span className="text-xs font-medium text-gray-500">
                          {getAlertLevel(alert.type)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed">
                        {alert.message}
                      </p>
                      {alert.zone && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                            📍 {alert.zone}
                          </span>
                        </div>
                      )}
                      {alert.fromCoastGuard && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                            🛡️ Coast Guard
                          </span>
                        </div>
                      )}
                      <div className="flex items-center mt-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertSystem;
