'use client';

import { useState, useEffect } from 'react';
import { Brain, Zap, Network, Sparkles, ArrowRight, Radio } from 'lucide-react';

const neuralSteps = [
  {
    id: 'capture',
    title: 'Captura Neural',
    description: 'Tu voz, texto e imágenes se convierten en sinapsis digitales',
    icon: Radio,
    color: 'from-blue-500 to-cyan-500',
    pulse: 'animate-pulse'
  },
  {
    id: 'process',
    title: 'Procesamiento AI',
    description: 'Neuronas artificiales extraen significado y contexto',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    pulse: 'animate-pulse'
  },
  {
    id: 'connect',
    title: 'Conexiones Sinápticas',
    description: 'Crea un grafo de conocimiento único y personal',
    icon: Network,
    color: 'from-green-500 to-emerald-500',
    pulse: 'animate-pulse'
  },
  {
    id: 'discover',
    title: 'Descubrimiento Inteligente',
    description: 'Relaciones ocultas se revelan ante tus ojos',
    icon: Sparkles,
    color: 'from-orange-500 to-red-500',
    pulse: 'animate-pulse'
  }
];

function NeuralNode({ step, isActive }: { step: typeof neuralSteps[0], isActive: boolean }) {
  return (
    <div className={`relative group ${isActive ? 'scale-110' : 'scale-100'} transition-all duration-700`}>
      {/* Neural Core */}
      <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${step.color} 
                      flex items-center justify-center shadow-2xl group-hover:shadow-3xl 
                      transition-all duration-500 ${isActive ? step.pulse : ''}`}>
        <step.icon size={32} className="text-white drop-shadow-lg" />
        
        {/* Energy Ring */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} 
                        opacity-30 blur-xl group-hover:opacity-50 transition-opacity duration-500`} />
        
        {/* Active Glow */}
        {isActive && (
          <div className={`absolute -inset-2 rounded-full bg-gradient-to-br ${step.color} 
                          opacity-20 blur-2xl animate-pulse`} />
        )}
      </div>
      
      {/* Neural Connections */}
      <div className="absolute -inset-8 opacity-40">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-8 bg-gradient-to-t ${step.color} rounded-full 
                       origin-bottom transform rotate-${i * 60} opacity-60`}
            style={{
              left: '50%',
              bottom: '50%',
              transform: `translateX(-50%) rotate(${i * 60}deg)`,
              animation: `pulse ${2 + i * 0.2}s ease-in-out infinite`
            }}
          />
        ))}
      </div>
    </div>
  );
}



export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % neuralSteps.length);
      setProgress(0);
      
      // Animate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => {
          if (p >= 1) {
            clearInterval(progressInterval);
            return 1;
          }
          return p + 0.02;
        });
      }, 50);
      
      return () => clearInterval(progressInterval);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="how-it-works" className="py-32 bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] relative overflow-hidden">
      {/* Neural Background Effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }} />
      </div>
      
      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2A2A2A] 
                          bg-[#1A1A1A]/30 mb-6">
            <Network size={16} className="text-blue-500 animate-pulse" />
            <span className="text-sm font-medium text-blue-400">Proceso Neural</span>
          </div>
          
          <h2 className="heading-h2 text-[#E5E5E5] mb-6">
            Tu Conocimiento se 
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 
                           bg-clip-text text-transparent animate-gradient-x">
              Transforma en Redes Neuronales
            </span>
          </h2>
          
          <p className="text-lg text-[#999999] max-w-3xl mx-auto leading-relaxed">
            Cada pensamiento, nota e idea se convierte en una sinapsis digital. 
            SecondBrain crea un universo de conocimiento interconectado que crece contigo.
          </p>
        </div>

        {/* Neural Flow Visualization */}
        <div className="relative mb-20">
          <div className="flex items-center justify-between max-w-4xl mx-auto relative">
            {neuralSteps.map((step, index) => (
              <div key={step.id} className="relative flex flex-col items-center">
                <NeuralNode step={step} isActive={activeStep === index} />
                
                {/* Step Info */}
                <div className={`mt-8 text-center transition-all duration-500 ${
                  activeStep === index ? 'opacity-100 transform translate-y-0' : 'opacity-70 translate-y-2'
                }`}>
                  <h3 className="text-lg font-semibold text-[#E5E5E5] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#999999] max-w-48 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {/* Arrow Connector */}
                {index < neuralSteps.length - 1 && (
                  <div className="absolute top-12 -right-20 lg:-right-32 hidden md:block">
                    <ArrowRight 
                      size={32} 
                      className={`text-[#2A2A2A] transition-colors duration-500 ${
                        activeStep === index ? 'text-blue-500' : ''
                      }`} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Neural Activity Visualization */}
        <div className="bg-[#1A1A1A]/30 rounded-3xl p-8 border border-[#2A2A2A] backdrop-blur-sm">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: Neural Simulation */}
            <div className="relative">
              <div className="text-center mb-6">
                <h4 className="text-xl font-semibold text-[#E5E5E5] mb-2">
                  Actividad Neural en Tiempo Real
                </h4>
                <p className="text-[#999999]">
                  Observa cómo tus ideas se conectan
                </p>
              </div>
              
              {/* Neural Network Visualization */}
              <div className="relative h-48 bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
                {/* Animated Nodes */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${neuralSteps[activeStep].color}`}
                    style={{
                      left: `${20 + (i % 4) * 20}%`,
                      top: `${30 + Math.floor(i / 4) * 25}%`,
                      animation: `pulse ${1 + i * 0.1}s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
                
                {/* Connections - Static positions to avoid hydration mismatch */}
                <svg className="absolute inset-0 w-full h-full">
                  <line x1="20%" y1="30%" x2="60%" y2="50%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0s' }} />
                  <line x1="40%" y1="25%" x2="70%" y2="65%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <line x1="15%" y1="60%" x2="45%" y2="35%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <line x1="65%" y1="20%" x2="30%" y2="70%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <line x1="50%" y1="40%" x2="80%" y2="55%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
                  <line x1="25%" y1="45%" x2="55%" y2="25%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '1s' }} />
                  <line x1="70%" y1="45%" x2="35%" y2="60%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
                  <line x1="35%" y1="15%" x2="65%" y2="75%" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" className="animate-pulse" style={{ animationDelay: '1.4s' }} />
                </svg>
              </div>
            </div>
            
            {/* Right: Current Process */}
            <div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${neuralSteps[activeStep].color} animate-pulse`} />
                  <span className="text-[#E5E5E5] font-medium">
                    {neuralSteps[activeStep].title} activo
                  </span>
                </div>
                
                <p className="text-[#999999] leading-relaxed">
                  {neuralSteps[activeStep].description}
                </p>
                
                {/* Progress Bar */}
                <div className="bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${neuralSteps[activeStep].color} transition-all duration-100`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 
                           text-white rounded-2xl font-semibold hover:from-blue-700 hover:via-purple-700 
                           hover:to-pink-700 transition-all duration-300 transform hover:scale-105 
                           shadow-2xl hover:shadow-blue-500/25">
            <span className="flex items-center gap-3">
              Unirse a Lista de Espera
              <Zap size={20} className="group-hover:scale-110 transition-transform" />
            </span>
            <div className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-orange-500 text-white rounded-full font-medium animate-pulse">
              Beta
            </div>
            
            {/* Neural Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 
                          opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
          </button>
          
          <p className="text-sm text-[#999999] mt-4">
            Acceso anticipado limitado. Tu transformación neural comienza pronto.
          </p>
        </div>
      </div>
    </section>
  );
}
