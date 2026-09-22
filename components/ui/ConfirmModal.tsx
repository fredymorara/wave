"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Info, Loader2, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "CONFIRM",
  cancelText = "CANCEL",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  // Handle ESC key & scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      border: "border-neon-crimson",
      shadow: "shadow-[0_0_30px_rgba(255,0,60,0.3)]",
      iconText: "text-neon-crimson",
      confirmBtn:
        "bg-neon-crimson text-void-black hover:bg-white shadow-[0_0_10px_rgba(255,0,60,0.5)]",
      icon: <AlertTriangle className="w-6 h-6 shrink-0" />,
    },
    primary: {
      border: "border-cyber-cyan",
      shadow: "shadow-[0_0_30px_rgba(0,240,255,0.3)]",
      iconText: "text-cyber-cyan",
      confirmBtn:
        "bg-cyber-cyan text-void-black hover:bg-white shadow-[0_0_10px_rgba(0,240,255,0.5)]",
      icon: <Info className="w-6 h-6 shrink-0" />,
    },
    warning: {
      border: "border-amber-400",
      shadow: "shadow-[0_0_30px_rgba(251,191,36,0.3)]",
      iconText: "text-amber-400",
      confirmBtn:
        "bg-amber-400 text-void-black hover:bg-white shadow-[0_0_10px_rgba(251,191,36,0.5)]",
      icon: <AlertTriangle className="w-6 h-6 shrink-0" />,
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className={`bg-surface-container border ${variantStyles.border} p-6 max-w-md w-full clip-corner ${variantStyles.shadow} flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 relative`}
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors p-1 cursor-pointer disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title and Icon */}
        <div className={`flex items-center gap-3 ${variantStyles.iconText}`}>
          {variantStyles.icon}
          <h3
            id="confirm-dialog-title"
            className="font-headline-lg text-lg uppercase tracking-wider text-white"
          >
            {title}
          </h3>
        </div>

        {/* Description */}
        <p
          id="confirm-dialog-desc"
          className="text-sm text-on-surface-variant leading-relaxed"
        >
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-surface-container-high hover:bg-surface-glass text-white font-label-caps text-xs clip-chip cursor-pointer transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={isLoading}
            className={`px-4 py-2 font-label-caps text-xs font-bold clip-chip cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 ${variantStyles.confirmBtn}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
