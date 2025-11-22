'use client';

import { ArrowRight, Zap } from 'lucide-react';

export function Hero() {
  return (
    <section className="min-h-[90vh] flex items-center justify-center pt-20 pb-12">
      <div className="container-custom w-full">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A]/50">
            <Zap size={16} className="text-blue-600" />
            <span className="text-sm">Tu segundo cerebro digital</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="heading-h1 text-[#E5E5E5]">
              Gestiona tu Conocimiento
              <br />
              <span className="text-blue-600">Sin Esfuerzo</span>
            </h1>
            <p className="text-xl text-[#999999] max-w-2xl mx-auto leading-relaxed">
              SecondBrain captura, organiza y conecta automáticamente toda tu información.
              Libera tu mente para lo que realmente importa: crear e innovar.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button className="btn-primary flex items-center gap-2 group">
              Comenzar Gratis
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="btn-secondary flex items-center gap-2">
              Ver Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="pt-8 flex flex-col items-center gap-4">
            <p className="text-sm text-[#999999]">Trusted by</p>
            <div className="flex items-center gap-8 opacity-60">
              <div className="w-24 h-8 bg-[#2A2A2A] rounded-lg animate-pulse" />
              <div className="w-24 h-8 bg-[#2A2A2A] rounded-lg animate-pulse" />
              <div className="w-24 h-8 bg-[#2A2A2A] rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
