import { Link } from "wouter";
import { BridgeLogo } from "@/components/BridgeLogo";
import { Bell, ChefHat, Zap, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-orange-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center">
            <BridgeLogo size={32} />
          </div>
          <span className="font-black text-gray-900 text-xl tracking-tight">Bridge Eats</span>
        </div>
        <Link href="/sign-in">
          <button
            data-testid="btn-sign-in-header"
            className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
          >
            Se connecter
          </button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-16">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          Gestion des commandes en temps réel
        </div>

        <h1 className="text-5xl font-black text-gray-900 leading-tight max-w-2xl mb-6">
          Votre restaurant,{" "}
          <span className="text-[#FF6B35]">zéro stress</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Recevez vos commandes de toutes les plateformes en un seul endroit.
          Alarme sonore, notifications push, et suivi en temps réel.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <Link href="/sign-in">
            <button
              data-testid="btn-sign-in-hero"
              className="px-8 py-4 rounded-2xl bg-[#FF6B35] text-white font-bold text-base shadow-lg shadow-orange-200 hover:bg-[#E04E1A] transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Se connecter
            </button>
          </Link>
          <Link href="/sign-up">
            <button
              data-testid="btn-sign-up-hero"
              className="px-8 py-4 rounded-2xl bg-white text-gray-700 font-bold text-base border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-orange-200"
            >
              Créer un compte
            </button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full">
          {[
            {
              icon: Bell,
              title: "Alarme persistante",
              desc: "Son fort dès qu'une commande arrive — jusqu'à 7 minutes si non traitée",
              color: "text-orange-500 bg-orange-50",
            },
            {
              icon: ChefHat,
              title: "Kanban en temps réel",
              desc: "Nouvelles → En cuisine → Prêtes. Statut mis à jour instantanément",
              color: "text-blue-500 bg-blue-50",
            },
            {
              icon: BarChart3,
              title: "Stats du jour",
              desc: "Chiffre d'affaires, délai moyen, nombre de commandes — en un coup d'œil",
              color: "text-emerald-500 bg-emerald-50",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                <f.icon size={22} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400">
        © {new Date().getFullYear()} Bridge Eats — Tous droits réservés
      </footer>
    </div>
  );
}
