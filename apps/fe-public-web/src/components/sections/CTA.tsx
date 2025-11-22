'use client';

import { ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 border-t border-[#2A2A2A]">
      <div className="container-custom">
        <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-blue-600/10 via-accent/5 to-transparent p-12 text-center">
          <h2 className="heading-h2 mb-4">
            Libera el Poder de tu Conocimiento
          </h2>
          <p className="text-lg text-[#999999] max-w-2xl mx-auto mb-8">
            Únete a miles de personas que ya están gestionando su conocimiento de forma más inteligente.
            Comienza gratis hoy, sin tarjeta de crédito.
          </p>
          <button className="btn-primary inline-flex items-center gap-2 group">
            Crear Cuenta Gratuita
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
