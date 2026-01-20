import './night-warning.css'

export function NightWarningModal({ onExtend }: { onExtend: () => void }) {
  return (
    <div className="night-overlay">
      <div className="night-modal">
        <h3>⚠️ Sistema será desligado em 10 minutos</h3>
        <p>Deseja manter o sistema ligado?</p>

        <button onClick={onExtend}>
          Continuar por +1 hora
        </button>
      </div>
    </div>
  )
}
