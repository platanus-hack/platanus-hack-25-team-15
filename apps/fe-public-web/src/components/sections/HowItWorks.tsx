'use client';

import { CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '1',
    title: 'Captura',
    description: 'Graba audio, sube archivos o escribe directamente. SecondBrain captura todo.',
  },
  {
    number: '2',
    title: 'Organiza',
    description: 'Tu contenido se organiza automáticamente por proyectos y contexto.',
  },
  {
    number: '3',
    title: 'Busca',
    description: 'Encuentra exactamente lo que necesitas en segundos con búsqueda inteligente.',
  },
  {
    number: '4',
    title: 'Conecta',
    description: 'Descubre relaciones entre tus notas y amplía tu comprensión.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 border-t border-[#2A2A2A]">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="heading-h2">Cómo Funciona</h2>
          <p className="text-lg text-[#999999] max-w-2xl mx-auto">
            Un flujo simple y poderoso para gestionar tu conocimiento
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Card */}
              <div className="p-6 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/30 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="text-[#999999] text-sm">{step.description}</p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-blue-600 to-transparent" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 p-8 rounded-xl border border-[#2A2A2A] bg-gradient-to-r from-blue-600/10 to-blue-600/5 text-center">
          <h3 className="text-xl font-semibold mb-2">¿Listo para optimizar tu productividad?</h3>
          <p className="text-[#999999] mb-6">
            Comienza con nuestro plan gratuito. Sin tarjeta de crédito requerida.
          </p>
          <button className="btn-primary inline-flex items-center gap-2">
            Comenzar Ahora
            <CheckCircle2 size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
