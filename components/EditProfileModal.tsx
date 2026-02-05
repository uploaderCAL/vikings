import React, { useState } from 'react';
import { Gender, VisibilityPreference, User } from '../types/index';
import { compressImage } from '../utils/imageUtils';

interface EditProfileModalProps {
  user: User;
  onSave: (data: { nickname: string; gender: Gender; visibility: VisibilityPreference; newAvatar?: string }) => void;
  onCancel: () => void;
  onLogout: () => void;
  isSaving: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  onSave,
  onCancel,
  onLogout,
  isSaving,
}) => {
  const [nickname, setNickname] = useState(user.nickname);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [visibility, setVisibility] = useState<VisibilityPreference>(user.visibility);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const currentAvatar = newAvatar || user.avatar;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setNewAvatar(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
      }
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nickname: nickname.trim() || user.nickname,
      gender,
      visibility,
      newAvatar: newAvatar || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Editar Perfil</h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {currentAvatar ? (
                    <img src={currentAvatar} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {nickname.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isCompressing && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-full">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
              </label>
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                Toque para alterar
              </p>
            </div>

            {/* Nickname */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">
                Seu Nome
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={15}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">
                Eu sou
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-medium"
              >
                <option value={Gender.MALE}>Homem</option>
                <option value={Gender.FEMALE}>Mulher</option>
                <option value={Gender.OTHER}>Outro</option>
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">
                Quero ver
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as VisibilityPreference)}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-medium"
              >
                <option value={VisibilityPreference.EVERYONE}>Todos</option>
                <option value={VisibilityPreference.MEN}>Apenas Homens</option>
                <option value={VisibilityPreference.WOMEN}>Apenas Mulheres</option>
              </select>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'SALVAR'}
            </button>
          </form>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full mt-4 py-3 border border-red-200 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-colors"
          >
            SAIR DA CONTA
          </button>
        </div>
      </div>
    </div>
  );
};
