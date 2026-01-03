import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

interface CameraInputProps {
  onImageCaptured: (base64: string) => void;
  isLoading: boolean;
}

export const CameraInput: React.FC<CameraInputProps> = ({ onImageCaptured, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix for API
      const base64Data = base64String.split(',')[1];
      onImageCaptured(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const triggerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full mb-6">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        onClick={triggerClick}
        disabled={isLoading}
        className={`w-full relative group overflow-hidden bg-white border-2 border-dashed ${
          dragActive ? 'border-tf-accent bg-stone-50' : 'border-stone-300'
        } rounded-2xl p-6 transition-all duration-300 hover:border-tf-accent hover:shadow-lg active:scale-95`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          {isLoading ? (
            <>
              <Loader2 className="w-8 h-8 text-tf-accent animate-spin" />
              <span className="text-sm font-medium text-stone-500">AI is analyzing your homework...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-tf-surface rounded-full flex items-center justify-center group-hover:bg-tf-accent group-hover:text-white transition-colors">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="block text-base font-semibold text-tf-accent">Snap-to-Plan</span>
                <span className="text-xs text-stone-400">Take a photo of your assignment</span>
              </div>
            </>
          )}
        </div>
      </button>
    </div>
  );
};