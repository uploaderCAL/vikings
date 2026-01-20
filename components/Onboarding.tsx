
import React, { useState } from 'react';
import { Gender, VisibilityPreference, User } from '../types/index';
import { UI_STRINGS, MOCK_AVATARS } from '../constants/index';
import { compressImage } from '../utils/imageUtils';

interface OnboardingProps {
  onComplete: (data: Partial<User>) => void;
  uploadedImage: string | null;
  setUploadedImage: (img: string | null) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, uploadedImage, setUploadedImage }) => {
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const compressed = await compressImage(file);
      setUploadedImage(compressed);
      setIsCompressing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6 max-w-md mx-auto overflow-y-auto">
      <div className="w-full text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{UI_STRINGS.ONBOARDING_TITLE}</h2>
        <p className="text-sm text-gray-500 mt-2">{UI_STRINGS.ONBOARDING_SUBTITLE}</p>
      </div>
      
      <div className="flex flex-col items-center mb-8">
         <label className="relative cursor-pointer group">
            <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {uploadedImage ? (
                <img src={uploadedImage} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
            {isCompressing && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
               </svg>
            </div>
         </label>
         <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Sua Foto (Opcional)</p>
      </div>

      <form className="w-full space-y-6" onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onComplete({
          nickname: formData.get('nickname') as string,
          gender: formData.get('gender') as Gender,
          visibility: formData.get('visibility') as VisibilityPreference,
        });
      }}>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">Seu Nome</label>
          <input name="nickname" required maxLength={15} placeholder="Como quer ser chamado?" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium" />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">Eu sou</label>
            <select name="gender" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none appearance-none font-medium">
              <option value={Gender.MALE}>Homem</option>
              <option value={Gender.FEMALE}>Mulher</option>
              <option value={Gender.OTHER}>Outro</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 px-1">Quero ver</label>
            <select name="visibility" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none appearance-none font-medium">
              <option value={VisibilityPreference.EVERYONE}>Todos</option>
              <option value={VisibilityPreference.MEN}>Apenas Homens</option>
              <option value={VisibilityPreference.WOMEN}>Apenas Mulheres</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={isCompressing} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all mt-4 disabled:opacity-50">ENTRAR</button>
      </form>
    </div>
  );
};
