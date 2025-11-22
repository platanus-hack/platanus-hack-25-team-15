'use client';

import { Mic2, FileText, Search, Share2, BarChart3, Lock } from 'lucide-react';

const features = [
  {
    icon: Mic2,
    title: 'Transcripción de Audio',
    description: 'Convierte tus ideas habladas en notas estructuradas automáticamente. Captura en movimiento.',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: FileText,
    title: 'Captura Inteligente',
    description: 'Guarda documentos, correos y contenido web en un solo lugar. Organización automática.',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    icon: Search,
    title: 'Búsqueda Avanzada',
    description: 'Encuentra exactamente lo que necesitas al instante. Búsqueda full-text y por contexto.',
    gradient: 'from-green-500 to-green-600',
  },
  {
    icon: Share2,
    title: 'Conexiones Automáticas',
    description: 'Descubre relaciones entre tus notas. Un grafo de conocimiento personal.',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    icon: BarChart3,
    title: 'Proyectos Organizados',
    description: 'Agrupa tus notas por espacios y proyectos. Contexto limpio y accesible.',
    gradient: 'from-pink-500 to-pink-600',
  },
  {
    icon: Lock,
    title: 'Privacidad Total',
    description: 'Tu conocimiento es privado. Sin rastreo, sin venta de datos. Seguridad garantizada.',
    gradient: 'from-indigo-500 to-indigo-600',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 border-t border-[#2A2A2A]">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="heading-h2">Características Poderosas</h2>
          <p className="text-lg text-[#999999] max-w-2xl mx-auto">
            Todo lo que necesitas para gestionar tu conocimiento personal de forma eficiente
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/30 hover:bg-[#1A1A1A]/60 transition-all duration-300 hover:border-accent/50"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} p-2.5 mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-[#999999]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
