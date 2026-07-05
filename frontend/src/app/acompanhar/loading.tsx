import { Loader2 } from 'lucide-react';
import { TrackingHeader } from '@/components/client-tracking/TrackingHeader';

/**
 * Loading state para a rota /acompanhar
 */
export default function AcompanharLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TrackingHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skeleton do formulário */}
          <section className="lg:col-span-1">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] animate-pulse">
              <div className="h-5 bg-slate-100 rounded-lg w-36 mb-4" />
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Skeleton do conteúdo */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] animate-pulse">
              <div className="h-4 bg-slate-100 rounded-lg w-48 mb-6" />
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="h-6 w-6 bg-slate-100 rounded-lg mx-auto" />
                    <div className="h-3 bg-slate-100 rounded-lg w-16 mx-auto" />
                    <div className="h-2 bg-slate-100 rounded-lg w-20 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
