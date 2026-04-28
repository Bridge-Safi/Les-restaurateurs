import { Badge } from "@/components/ui/badge";

export function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  
  if (normalized.includes('uber')) {
    return <Badge className="bg-black text-white hover:bg-black/80 border border-white/20 uppercase tracking-widest font-bold">Uber Eats</Badge>;
  }
  if (normalized.includes('deliveroo')) {
    return <Badge className="bg-[#00CCBC] text-white hover:bg-[#00CCBC]/80 uppercase tracking-widest font-bold">Deliveroo</Badge>;
  }
  if (normalized.includes('just') || normalized.includes('eat')) {
    return <Badge className="bg-[#FF8000] text-white hover:bg-[#FF8000]/80 uppercase tracking-widest font-bold">Just Eat</Badge>;
  }
  
  return <Badge variant="secondary" className="uppercase tracking-widest font-bold">{platform}</Badge>;
}
