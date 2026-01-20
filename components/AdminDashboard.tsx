import React, { useState } from 'react';
import { NightConfig, User, Thread } from '../types/index';
import { UI_STRINGS } from '../constants/index';

import './admin/admin-dashboard.css';

interface AdminDashboardProps {
  nightConfig: NightConfig;
  users: User[];
  threads: Thread[];
  onToggleNight: () => void;
  onAddSSID: (ssid: string) => void;
  onRemoveSSID: (ssid: string) => void;
  onSetActiveSSID: (ssid: string | null) => void;
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  nightConfig,
  users,
  threads,
  onToggleNight,
  onAddSSID,
  onRemoveSSID,
  onSetActiveSSID,
  onExit
}) => {
  const [newSSID, setNewSSID] = useState('');

  const entryUrl =
    window.location.origin + window.location.pathname;

  const qrCodeUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(entryUrl)}`;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSSID.trim()) {
      onAddSSID(newSSID.trim());
      setNewSSID('');
    }
  };

  return (
    <div className="admin-root">
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="admin-title">
            {UI_STRINGS.ADMIN_TITLE}
          </h1>

          <button
            onClick={onExit}
            className="admin-exit"
          >
            SAIR DO PAINEL
          </button>
        </div>

        <div className="admin-grid">

          {/* STATUS */}
          <div className="admin-card">
            <h2 className="admin-label">
              Status do Sistema
            </h2>

            <div className="admin-status-row">
              <span
                className={`admin-status ${
                  nightConfig.isNightOn ? 'on' : 'off'
                }`}
              >
                {nightConfig.isNightOn
                  ? 'ONLINE'
                  : 'OFFLINE'}
              </span>
            </div>

            {nightConfig.isNightOn ? (
              <button
                className="admin-stop"
                onClick={onToggleNight}
              >
                DESLIGAR SISTEMA
              </button>
            ) : (
              <button
                className="admin-start"
                onClick={onToggleNight}
              >
                LIGAR SISTEMA
              </button>
            )}
          </div>

          {/* WIFI */}
          <div className="admin-card">
            <h2 className="admin-label">
              Redes Wi-Fi do Evento
            </h2>

            <form
              onSubmit={handleAdd}
              className="admin-ssid-form"
            >
              <input
                value={newSSID}
                onChange={e => setNewSSID(e.target.value)}
                placeholder="Nome da rede"
              />
              <button type="submit">
                ADD
              </button>
            </form>

            <div className="admin-ssid-list">
              {nightConfig.validWifiSSIDs.map(ssid => (
                <div
                  key={ssid}
                  className={`admin-ssid ${
                    nightConfig.currentWifiSSID === ssid
                      ? 'active'
                      : ''
                  }`}
                >
                  <span>{ssid}</span>

                  <div>
                    <button
                      onClick={() =>
                        onSetActiveSSID(
                          nightConfig.currentWifiSSID === ssid
                            ? null
                            : ssid
                        )
                      }
                    >
                      {nightConfig.currentWifiSSID === ssid
                        ? 'Ativa'
                        : 'Ativar'}
                    </button>

                    <button
                      onClick={() => onRemoveSSID(ssid)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MÉTRICAS */}
          <div className="admin-card">
            <h2 className="admin-label">
              Acesso Rápido
            </h2>

            <div className="admin-qr">
              <img
                src={qrCodeUrl}
                alt="QR Code"
              />
            </div>

            <div className="admin-metrics">
              <div>
                <strong>
                  {users.length}
                </strong>
                <span>Membros</span>
              </div>

              <div>
                <strong>
                  {threads.length}
                </strong>
                <span>Conversas</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
