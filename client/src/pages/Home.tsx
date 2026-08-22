/* Design: Atlas Operations — asymmetric command room, charcoal map, coral orders, Rajdhani + IBM Plex Sans. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Factory, Flag, Fuel, Globe2, Plane, Radar, Shield, Swords, Wheat, Wind, Zap } from "lucide-react";
import { toast } from "sonner";
import GameCanvas from "@/components/GameCanvas";
import WorldMap from "@/components/WorldMap";

const mapArt = "/manus-storage/realistic-world-map-mobile_02465030.png";
const markArt = "/manus-storage/command-mark_b62fba83.png";

type Province = { name: string; city: string; role: string; health: number; buildings: string[] };
type Country = { id: string; name: string; region: string; color: string; x: number; y: number; cities: string[]; status: string; alliance?: string };
type Ownership = "player" | "ally" | "ai" | "neutral";
type GamePhase = "setup" | "playing" | "won" | "lost";
type Difficulty = "easy" | "normal" | "hard";
type PersistedGame = { selectedId: string; playerCountryId?: string; difficulty?: Difficulty; gamePhase?: GamePhase; resources: typeof initialResources; builds: typeof initialBuilds; airborne: number; occupiedIds: string[]; ownership: Record<string, Ownership>; techLevels: Record<string, number>; logs: LogEntry[]; aiProgress: Record<string, number>; lastSavedAt: string };
const initialResources = { gold: 12480, soldiers: 286, fuel: 74, power: 68 };
const initialBuilds = { farms: 4, factories: 3, bridges: 2, airports: 2 };

const mapCountryIds: Record<string, string> = { egypt: "818", turkey: "792", france: "250", brazil: "076", india: "356", australia: "036" };

const provinceData: Record<string, Province[]> = {
  egypt: [{ name: "القاهرة", city: "القاهرة الكبرى", role: "مركز قيادة", health: 86, buildings: ["مصنع", "رادار"] }, { name: "الإسكندرية", city: "الساحل الشمالي", role: "مطار / ميناء", health: 73, buildings: ["مطار", "كوبري"] }, { name: "أسوان", city: "جنوب الوادي", role: "زراعة / دفاع", health: 61, buildings: ["زراعة"] }],
  turkey: [{ name: "أنقرة", city: "وسط الأناضول", role: "مركز قيادة", health: 79, buildings: ["مصنع", "رادار"] }, { name: "إسطنبول", city: "البوسفور", role: "مطار / ممر", health: 88, buildings: ["مطار", "كوبري"] }, { name: "إزمير", city: "ساحل إيجة", role: "ميناء / إنتاج", health: 67, buildings: ["مصنع"] }],
  france: [{ name: "باريس", city: "إيل دو فرانس", role: "مركز قيادة", health: 82, buildings: ["مصنع", "دفاع"] }, { name: "ليون", city: "أوفيرني رون ألب", role: "إنتاج", health: 64, buildings: ["مصنع"] }, { name: "مرسيليا", city: "بروفانس", role: "مطار / ميناء", health: 71, buildings: ["مطار"] }],
  brazil: [{ name: "برازيليا", city: "المقاطعة الفيدرالية", role: "مركز قيادة", health: 78, buildings: ["مصنع"] }, { name: "ساو باولو", city: "الجنوب الشرقي", role: "إنتاج", health: 86, buildings: ["مصنع", "زراعة"] }, { name: "ريو", city: "ريو دي جانيرو", role: "مطار / ميناء", health: 69, buildings: ["مطار"] }],
  india: [{ name: "نيودلهي", city: "إقليم العاصمة", role: "مركز قيادة", health: 81, buildings: ["مصنع", "رادار"] }, { name: "مومباي", city: "ماهاراشترا", role: "مطار / ميناء", health: 75, buildings: ["مطار", "مصنع"] }, { name: "بنغالور", city: "كارناتاكا", role: "تقنية / إنتاج", health: 72, buildings: ["مصنع"] }],
  australia: [{ name: "كانبيرا", city: "إقليم العاصمة", role: "مركز قيادة", health: 76, buildings: ["رادار"] }, { name: "سيدني", city: "نيو ساوث ويلز", role: "مطار / ميناء", health: 84, buildings: ["مطار"] }, { name: "بيرث", city: "أستراليا الغربية", role: "زراعة / إمداد", health: 66, buildings: ["زراعة", "كوبري"] }],
};

const countries: Country[] = [
  { id: "egypt", name: "مصر", region: "شمال أفريقيا", color: "#ff6b4a", x: 52, y: 47, cities: ["القاهرة", "الإسكندرية", "أسوان"], status: "قيادتك" },
  { id: "turkey", name: "تركيا", region: "أوراسيا", color: "#d8a55a", x: 55, y: 35, cities: ["أنقرة", "إسطنبول", "إزمير"], status: "حليف", alliance: "حلف المتوسط" },
  { id: "france", name: "فرنسا", region: "أوروبا", color: "#6086a7", x: 44, y: 34, cities: ["باريس", "ليون", "مرسيليا"], status: "خصم افتراضي" },
  { id: "brazil", name: "البرازيل", region: "أمريكا الجنوبية", color: "#739b75", x: 30, y: 65, cities: ["برازيليا", "ساو باولو", "ريو"], status: "خصم افتراضي" },
  { id: "india", name: "الهند", region: "آسيا", color: "#8877a6", x: 67, y: 49, cities: ["نيودلهي", "مومباي", "بنغالور"], status: "خصم افتراضي" },
  { id: "australia", name: "أستراليا", region: "أوقيانوسيا", color: "#aa8e62", x: 79, y: 72, cities: ["كانبيرا", "سيدني", "بيرث"], status: "خصم افتراضي" },
];

const techNodes = [
  { id: "infantry", title: "مشاة مدرعة", type: "قوات برية", level: 2, cost: 1400, effect: "+18% قوة الهجوم", icon: Shield },
  { id: "air", title: "أجنحة الاعتراض", type: "طيران", level: 1, cost: 2200, effect: "+12% دقة / اعتراض أسرع", icon: Plane },
  { id: "missile", title: "صواريخ بعيدة", type: "أسلحة استراتيجية", level: 0, cost: 2800, effect: "+26% مدى الضربة", icon: Zap },
  { id: "radar", title: "رادار مبكر", type: "دفاع جوي", level: 1, cost: 1800, effect: "+20% كشف الصواريخ", icon: Radar },
];

type EventType = "all" | "attack" | "alliance" | "production" | "defense" | "system";
type LogEntry = { id: number; text: string; time: string; type: Exclude<EventType, "all"> };

const eventLabels: Record<Exclude<EventType, "all">, string> = { attack: "هجوم", alliance: "تحالف", production: "إنتاج", defense: "دفاع", system: "نظام" };
const eventColors: Record<Exclude<EventType, "all">, string> = { attack: "event-attack", alliance: "event-alliance", production: "event-production", defense: "event-defense", system: "event-system" };

const initialLogs: LogEntry[] = [
  { id: 1, time: "08:42:19", type: "defense", text: "شبكة الرادار ترصد حركة جوية فوق المتوسط" },
  { id: 2, time: "08:39:04", type: "production", text: "مصنع القاهرة بدأ دورة إنتاج جديدة" },
  { id: 3, time: "08:34:47", type: "alliance", text: "الحليف التركي فتح ممر مطار إسطنبول" },
  { id: 4, time: "08:27:12", type: "system", text: "تم تحديث مستوى الإمداد في الإسكندرية" },
];

const normalizeLogs = (entries?: LogEntry[]) => { const source = entries?.length ? entries : initialLogs; const numericIds = source.map((entry) => Number(entry.id)).filter(Number.isFinite); let nextId = Math.max(initialLogs.length, ...numericIds) + 1; const seen = new Set<number>(); return source.map((entry) => { let id = Number(entry.id); if (!Number.isFinite(id) || seen.has(id)) id = nextId++; seen.add(id); return { ...entry, id }; }); };

export default function Home() {
  const [restoredGame] = useState<Partial<PersistedGame> | null>(() => { try { const raw = window.localStorage.getItem("frontworlds-command-save"); return raw ? JSON.parse(raw) as Partial<PersistedGame> : null; } catch { return null; } });
  const defaultPlayerId = restoredGame?.playerCountryId ?? "egypt";
  const [gamePhase, setGamePhase] = useState<GamePhase>(restoredGame?.gamePhase === "won" || restoredGame?.gamePhase === "lost" ? restoredGame.gamePhase : "setup");
  const [playerCountryId, setPlayerCountryId] = useState(defaultPlayerId);
  const [difficulty, setDifficulty] = useState<Difficulty>(restoredGame?.difficulty ?? "normal");
  const [showTutorial, setShowTutorial] = useState(false);
  const [aiAttack, setAiAttack] = useState<{ attacker: string; target: string; x: number; y: number; phase: string } | null>(null);
  const restoredLogs: LogEntry[] = restoredGame?.logs?.length ? normalizeLogs(restoredGame.logs) : initialLogs;
  const [selectedId, setSelectedId] = useState(restoredGame?.selectedId ?? "egypt");
  const [mapMode, setMapMode] = useState<"sovereignty" | "supply" | "air">("sovereignty");
  const [resources, setResources] = useState(restoredGame?.resources ?? initialResources);
  const [builds, setBuilds] = useState(restoredGame?.builds ?? initialBuilds);
  const [logs, setLogs] = useState<LogEntry[]>(restoredLogs);
  const [eventFilter, setEventFilter] = useState<EventType>("all");
  const [pulse, setPulse] = useState<{ x: number; y: number; color: string } | null>(null);
  const nextLogId = useRef(Math.max(initialLogs.length, ...restoredLogs.map((entry) => entry.id)) + 1);
  const aiProgressRef = useRef(restoredGame?.aiProgress ?? { france: 42, brazil: 31, india: 57, australia: 24 });
  const aiStageRef = useRef<Record<string, number>>({});
  const [airborne, setAirborne] = useState(restoredGame?.airborne ?? 1);
  const [occupiedIds, setOccupiedIds] = useState<string[]>(restoredGame?.occupiedIds ?? []);
  const [ownership, setOwnership] = useState<Record<string, Ownership>>(restoredGame?.ownership ?? { "818": "player", "792": "ally", "250": "ai", "076": "ai", "356": "ai", "036": "ai" });
  const [aiProgress, setAiProgress] = useState<Record<string, number>>(restoredGame?.aiProgress ?? { france: 42, brazil: 31, india: 57, australia: 24 });
  const [lastSavedAt, setLastSavedAt] = useState(restoredGame?.lastSavedAt ?? "");
  const [breakAllianceAt, setBreakAllianceAt] = useState<number | null>(null);
  const [showTechTree, setShowTechTree] = useState(false);
  const [techLevels, setTechLevels] = useState<Record<string, number>>(restoredGame?.techLevels ?? { infantry: 1, air: 0, missile: 0, radar: 0 });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const selected = countries.find((country) => country.id === selectedId) ?? countries[0];
  const selectedProvinces = provinceData[selected.id] ?? provinceData.egypt;
  const saveGame = (manual = false) => { const payload: PersistedGame = { selectedId, playerCountryId, difficulty, gamePhase, resources, builds, airborne, occupiedIds, ownership, techLevels, logs, aiProgress, lastSavedAt: new Date().toISOString() }; window.localStorage.setItem("frontworlds-command-save", JSON.stringify(payload)); setLastSavedAt(payload.lastSavedAt); if (manual) toast.success("تم حفظ الجولة"); };
  const startNewGame = () => { window.localStorage.removeItem("frontworlds-command-save"); setGamePhase("setup"); setLastSavedAt(""); toast.info("اختر الدولة ومستوى الصعوبة لبدء جولة جديدة"); };
  const beginScenario = (countryId: string, selectedDifficulty: Difficulty) => { const nextOwnership: Record<string, Ownership> = { "818": "neutral", "792": "neutral", "250": "ai", "076": "ai", "356": "ai", "036": "ai" }; nextOwnership[mapCountryIds[countryId]] = "player"; setPlayerCountryId(countryId); setSelectedId(countryId); setDifficulty(selectedDifficulty); setGamePhase("playing"); setShowTutorial(window.localStorage.getItem("frontworlds-tutorial-seen") !== "1"); setResources(initialResources); setBuilds(initialBuilds); setLogs([{ id: 1, time: new Date().toLocaleTimeString("ar-EG", { hour12: false }), type: "system", text: `بدأت حملة ${countries.find((country) => country.id === countryId)?.name ?? "جديدة"} على صعوبة ${selectedDifficulty === "easy" ? "مبتدئ" : selectedDifficulty === "hard" ? "خبير" : "قياسي"}` }, ...initialLogs]); setAirborne(1); setOccupiedIds([]); setOwnership(nextOwnership); const nextAi = { france: 12, brazil: 8, india: 16, australia: 5 }; setAiProgress(nextAi); aiProgressRef.current = nextAi; aiStageRef.current = {}; setTechLevels({ infantry: 1, air: 0, missile: 0, radar: 0 }); setLastSavedAt(""); nextLogId.current = initialLogs.length + 2; toast.success("انطلقت الجولة"); };
  const currentStatus = selected.id === playerCountryId ? "قيادتك" : occupiedIds.includes(selected.id) ? "تحت سيطرتك" : selected.status;
  const dismissTutorial = () => { window.localStorage.setItem("frontworlds-tutorial-seen", "1"); setShowTutorial(false); };

  useEffect(() => { const saveTimer = window.setInterval(() => saveGame(), 5000); return () => window.clearInterval(saveTimer); });

  useEffect(() => {
    if (gamePhase !== "playing") return;
    const aiTimer = window.setInterval(() => {
      const notices = ["فرنسا تعيد توزيع وحدات الدفاع على حدود المتوسط", "الهند رفعت إنتاج الطائرات بنسبة 8%", "البرازيل أنشأت نقطة إمداد جديدة"];
      const aiKey = ["france", "india", "brazil"][Math.floor(Date.now() / 18000) % 3]; const nextProgress = Math.min(100, (aiProgressRef.current[aiKey] ?? 0) + (difficulty === "hard" ? 4 : difficulty === "easy" ? 1 : 2)); aiProgressRef.current = { ...aiProgressRef.current, [aiKey]: nextProgress }; setAiProgress(aiProgressRef.current); const noticeIndex = Math.floor(Date.now() / 18000) % notices.length; const targetCountry = countries.find((country) => country.id === playerCountryId) ?? countries[0]; const currentStage = aiStageRef.current[aiKey] ?? 0; const nextStage = nextProgress >= 85 ? 3 : nextProgress >= 65 ? 2 : nextProgress >= 40 ? 1 : 0; if (nextStage > currentStage) { aiStageRef.current = { ...aiStageRef.current, [aiKey]: nextStage }; const phaseLabel = nextStage === 1 ? "مدينة" : nextStage === 2 ? "محافظة" : "العاصمة"; setAiAttack({ attacker: aiKey, target: playerCountryId, x: targetCountry.x * 9.6, y: targetCountry.y * 4.9, phase: phaseLabel }); setLogs((current) => [{ id: nextLogId.current++, time: new Date().toLocaleTimeString("ar-EG", { hour12: false }), type: "attack", text: `${aiKey} بدأ المرحلة ${phaseLabel} ضد ${targetCountry.name}` } as LogEntry, ...current].slice(0, 12)); if (nextStage === 3) { setOwnership((current) => ({ ...current, [mapCountryIds[playerCountryId]]: "ai" })); setGamePhase("lost"); } } else { setLogs((current) => [{ id: nextLogId.current++, time: new Date().toLocaleTimeString("ar-EG", { hour12: false }), type: noticeIndex === 0 ? "defense" : noticeIndex === 1 ? "production" : "attack", text: `${notices[noticeIndex]} · التقدم ${nextProgress}%` } as LogEntry, ...current].slice(0, 12)); }
    }, 18000);
    return () => window.clearInterval(aiTimer);
  }, [difficulty, gamePhase, playerCountryId]);

  useEffect(() => {
    if (!breakAllianceAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, breakAllianceAt - Date.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining === 0) {
        setBreakAllianceAt(null);
        setLogs((current) => [{ id: nextLogId.current++, time: new Date().toLocaleTimeString("ar-EG", { hour12: false }), type: "alliance", text: "انتهت مهلة فض التحالف — تم تأمين الحدود" } as LogEntry, ...current].slice(0, 12));
        toast.error("انتهت مهلة فض التحالف");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breakAllianceAt]);

  const stats = useMemo(() => [
    { label: "الذهب", value: resources.gold.toLocaleString("en-US"), delta: "+240 / دقيقة", icon: Zap, tone: "gold" },
    { label: "الجنود", value: resources.soldiers.toLocaleString("en-US"), delta: "+18 / دقيقة", icon: Shield, tone: "green" },
    { label: "الوقود", value: `${resources.fuel}%`, delta: "مدى 1,240 كم", icon: Fuel, tone: "blue" },
    { label: "القدرة", value: `${resources.power}%`, delta: "مستقرة", icon: Radar, tone: "coral" },
  ], [resources]);
  const filteredLogs = eventFilter === "all" ? logs : logs.filter((log) => log.type === eventFilter);

  const addLog = (entry: string, type: Exclude<EventType, "all"> = "system") => { setPulse({ x: 430, y: 245, color: type === "attack" ? "#ff6b4a" : type === "production" ? "#77b38c" : type === "alliance" ? "#d9a958" : "#79a9ca" }); window.setTimeout(() => setPulse(null), 1100); setLogs((current) => [{ id: nextLogId.current++, time: new Date().toLocaleTimeString("ar-EG", { hour12: false }), type, text: entry }, ...current].slice(0, 12)); };
  const build = (kind: keyof typeof builds, cost: number, label: string) => {
    if (resources.gold < cost) return toast.error("الذهب غير كافٍ لهذا الأمر");
    setResources((value) => ({ ...value, gold: value.gold - cost }));
    setBuilds((value) => ({ ...value, [kind]: value[kind] + 1 }));
    addLog(`تم إنشاء ${label} في ${selected.name}`, "production");
    toast.success(`${label} جاهز في ${selected.name}`);
  };
  const orderTroops = () => {
    if (resources.gold < 800) return toast.error("تحتاج 800 ذهب لإصدار طلب قوات");
    setResources((value) => ({ ...value, gold: value.gold - 800, soldiers: value.soldiers + 36 }));
    addLog("تم طلب 36 جنديًا — الوصول خلال 42 ثانية", "production");
    toast.success("تم تسجيل طلب القوات");
  };
  const attackSelected = () => {
    if (selected.id === playerCountryId || occupiedIds.includes(selected.id)) return toast.info("هذه الأرض تحت سيطرتك بالفعل");
    if (selected.status === "حليف") return toast.error("لا يمكن مهاجمة الحليف أثناء التحالف");
    if (resources.soldiers < 48) return toast.error("تحتاج إلى 48 جنديًا لبدء الهجوم");
    setResources((value) => ({ ...value, soldiers: value.soldiers - 48, gold: value.gold + 960 }));
    const nextOccupied = Array.from(new Set([...occupiedIds, selected.id]));
    setOccupiedIds(nextOccupied);
    setOwnership((value) => ({ ...value, [mapCountryIds[selected.id]]: "player" }));
    const remainingEnemies = countries.filter((country) => country.id !== playerCountryId && country.id !== "turkey").every((country) => nextOccupied.includes(country.id));
    if (remainingEnemies) setGamePhase("won");
    addLog(`تم احتلال ${selected.name} — قوات الحامية انتشرت في المدن`, "attack");
    toast.success(`${selected.name} أصبحت تحت سيطرتك`);
  };
  const launchPlane = () => {
    if (resources.fuel < 14) return toast.error("الوقود غير كافٍ للإقلاع");
    setResources((value) => ({ ...value, fuel: value.fuel - 14 }));
    setAirborne((value) => value + 1);
    addLog("طائرة اعتراضية أقلعت من مطار القاهرة", "defense");
  };
  const beginBreakAlliance = () => {
    const hasForcesInside = selected.id === "turkey";
    const seconds = hasForcesInside ? 300 : 180;
    setBreakAllianceAt(Date.now() + seconds * 1000);
    setSecondsLeft(seconds);
    addLog(`بدأ فض التحالف — المهلة ${seconds / 60} دقائق${hasForcesInside ? " بسبب وجود قوات داخل الأراضي" : ""}`);
    toast.warning(`فض التحالف سيكتمل خلال ${seconds / 60} دقائق`);
  };
  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const research = (node: typeof techNodes[number]) => {
    const current = techLevels[node.id] ?? 0;
    if (current >= 3) return toast.info("هذه الترقية وصلت إلى الحد الأقصى");
    if (resources.gold < node.cost) return toast.error(`تحتاج ${node.cost.toLocaleString("en-US")} ذهب لبدء البحث`);
    setResources((value) => ({ ...value, gold: value.gold - node.cost }));
    setTechLevels((value) => ({ ...value, [node.id]: current + 1 }));
    addLog(`بدأ بحث ${node.title} — المستوى ${current + 1}`);
    toast.success(`تمت ترقية ${node.title}`);
  };

  if (gamePhase === "setup") return <main className="start-screen"><div className="start-card"><div className="start-brand"><img src={markArt} alt="" /><span>FRONTWORLDS <b>COMMAND</b></span></div><span className="eyebrow">تهيئة حملة جديدة / الموسم 04</span><h1>اختر مسرحك<br /><em>وابدأ السباق</em></h1><p>اختر دولة واحدة. ستتنافس القوى الافتراضية على الموارد والممرات حتى تفرض سيادتك على الخريطة.</p><div className="setup-label">الدولة الأساسية</div><div className="country-select-grid">{countries.map((country) => <button key={`setup-${country.id}`} className={playerCountryId === country.id ? "setup-country active" : "setup-country"} onClick={() => { setPlayerCountryId(country.id); setSelectedId(country.id); }}><strong>{country.name}</strong><small>{country.region}</small><i>{country.cities.length} مدن</i></button>)}</div><div className="setup-label">مستوى الخصوم</div><div className="difficulty-row">{([['easy','مبتدئ','توسع بطيء'],['normal','قياسي','تنافس متوازن'],['hard','خبير','هجمات أسرع']] as const).map(([id, title, hint]) => <button key={`difficulty-${id}`} className={difficulty === id ? "difficulty active" : "difficulty"} onClick={() => setDifficulty(id)}><strong>{title}</strong><small>{hint}</small></button>)}</div><button className="launch-campaign" onClick={() => beginScenario(playerCountryId, difficulty)}>إطلاق الحملة <span>↗</span></button></div></main>;
  if (gamePhase === "won" || gamePhase === "lost") return <main className="result-screen"><div className={`result-card ${gamePhase}`}><span className="eyebrow">تقرير نهاية الحملة</span><div className="result-mark">{gamePhase === "won" ? "✓" : "×"}</div><h1>{gamePhase === "won" ? "السيادة الكاملة" : "سقطت العاصمة"}</h1><p>{gamePhase === "won" ? "أحكمت السيطرة على كل الأراضي المعادية وأغلقت مسارات الخصوم." : "نجح أحد الخصوم في اختراق عاصمتك والسيطرة على مركز القيادة."}</p><div className="result-stats"><span><b>{1 + occupiedIds.length}</b> أراضٍ تحت السيطرة</span><span><b>{resources.soldiers}</b> جندي متبقٍ</span></div><button className="launch-campaign" onClick={startNewGame}>بدء حملة جديدة <span>↗</span></button></div></main>;
  return (
    <main className="command-shell">
      {showTutorial && <div className="tutorial-overlay"><div className="tutorial-card"><span className="eyebrow">دليل الميدان / 01</span><h2>ثلاث خطوات للسيادة</h2><div className="tutorial-steps"><div><b>01</b><strong>حدد هدفًا</strong><span>اختر دولة من الخريطة أو لوحة المدن.</span></div><div><b>02</b><strong>ابنِ واقْتَلِع</strong><span>استخدم الذهب لبناء المصانع والزراعة والجسور واطلب القوات قبل الهجوم.</span></div><div><b>03</b><strong>انتبه للمراحل</strong><span>الخصوم يهاجمون المدينة ثم المحافظة ثم العاصمة. تفوز بالسيطرة على العالم وتخسر بسقوط عاصمتك.</span></div></div><button className="launch-campaign" onClick={dismissTutorial}>فهمت — إلى غرفة العمليات <span>↗</span></button></div></div>}
      <header className="topbar">
        <div className="brand-lockup"><img src={markArt} alt="" /><div><strong>FRONTWORLDS <span>COMMAND</span></strong><small>ATLAS OPERATIONS / SEASON 01</small></div></div>
        <div className="top-status"><span className="live-dot" />جلسة محلية <b>08:42:19</b><span className="divider" /><Globe2 size={15} /> العالم / الموسم 04</div>
        <button className="save-button" onClick={() => saveGame(true)}>حفظ الجولة</button><button className="new-game-button" onClick={startNewGame}>جولة جديدة</button><button className="icon-button" aria-label="التنبيهات"><Bell size={18} /><i>3</i></button>
      </header>

      <section className="command-layout">
        <aside className="left-rail">
          <div className="rail-title"><span>01</span><h2>مسرح العمليات</h2></div>
          <div className="mini-map"><div className="mini-scan" /><div className="mini-line one" /><div className="mini-line two" /><span className="mini-pin pin-a" /><span className="mini-pin pin-b" /><span className="mini-pin pin-c" /></div>
          <div className="rail-section"><label>مؤشر السيادة</label><div className="big-number">14.8<span>%</span></div><div className="progress"><b style={{ width: "62%" }} /></div><small>ترتيب عالمي <strong>#07</strong></small></div>
          <div className="rail-section objectives"><label>أهداف الجولة</label><p><span className="check">✓</span> تأمين شمال أفريقيا</p><p><span className="check">✓</span> بناء شبكة إمداد</p><p><span className="pending">◌</span> فتح ممر جوي لأوروبا</p><div className="ai-progress"><small>تقدم الخصوم الافتراضيين</small>{([['فرنسا','france'], ['الهند','india'], ['البرازيل','brazil']] as const).map(([name, key]) => <div key={`ai-progress-${key}`}><span>{name}</span><b><i style={{ width: `${aiProgress[key] ?? 0}%` }} /></b></div>)}</div></div>
          <div className="rail-footer"><span>إصدار 0.1 / محلي</span><span className="keyhint">?</span></div>
        </aside>

        <section className="map-stage">
          <div className="map-heading"><div><span className="eyebrow">الخريطة السياسية / عرض تكتيكي</span><h1>العالم المفتوح</h1></div><div className="map-tools"><button className={mapMode === "sovereignty" ? "tool-active" : ""} onClick={() => setMapMode("sovereignty")}>السيادة</button><button className={mapMode === "supply" ? "tool-active" : ""} onClick={() => setMapMode("supply")}>الإمداد</button><button className={mapMode === "air" ? "tool-active" : ""} onClick={() => setMapMode("air")}>الجو</button></div></div>
          <div className={`world-map map-mode-${mapMode}`}><WorldMap ownership={ownership} selectedId={mapCountryIds[selected.id] ?? "818"} aiAttack={aiAttack} detailNodes={selectedProvinces.map((province, index) => ({ name: province.name, x: Math.min(900, Math.max(40, selected.x * 9.6 + (index - 1) * 32)), y: Math.min(450, Math.max(40, selected.y * 4.9 + (index - 1) * 24)) }))} onSelect={(mapId, name) => { const found = Object.entries(mapCountryIds).find(([, value]) => value === mapId); if (found) setSelectedId(found[0]); else toast.info(`${name}: تم تحديد الدولة على الخريطة`); }} pulse={pulse} />
            <GameCanvas />
            <div className="map-compass"><span>N</span><div>+</div><small>مقياس 1:42M</small></div>
            <div className="map-caption"><span className="live-dot" />تحديث مباشر <b>6 دول / 18 مدينة / 4 ممرات</b>{lastSavedAt && <small> · محفوظ {new Date(lastSavedAt).toLocaleTimeString("ar-EG", { hour12: false })}</small>}</div>
          </div>
          <div className="map-legend"><span><i className="legend-dot owned" />أراضيك</span><span><i className="legend-dot ally" />حليف</span><span><i className="legend-dot enemy" />خصم افتراضي</span><span><i className="legend-line" />طريق إمداد</span></div>
        </section>

        <aside className="intel-panel">
          <div className="panel-head"><div><span className="eyebrow">ملف الدولة / 001</span><h2>{selected.name}</h2><p>{selected.region} · <span className={currentStatus === "قيادتك" || currentStatus === "تحت سيطرتك" ? "text-coral" : currentStatus === "حليف" ? "text-gold" : "text-blue"}>{currentStatus}</span></p></div><div className="panel-head-actions"><button className={`tech-toggle ${showTechTree ? "active" : ""}`} onClick={() => setShowTechTree((value) => !value)}><Zap size={15} /> التطوير</button><Flag size={22} className="panel-flag" /></div></div>
          <div className="country-stats"><div><small>المدن</small><b>{selected.cities.length}</b></div><div><small>المستوى</small><b>04</b></div><div><small>الإمداد</small><b className="text-green">82%</b></div></div><div className="overview-stats"><div><small>الأراضي المسيطر عليها</small><b>{1 + occupiedIds.length}</b><span>منطقة استراتيجية</span></div><div><small>إجمالي الوحدات</small><b>{resources.soldiers + airborne}</b><span>{resources.soldiers} برية · {airborne} جوية</span></div><div><small>قيمة الموارد</small><b>{(resources.gold + resources.power * 100).toLocaleString("en-US")}</b><span>ذهب + قدرة تشغيلية</span></div></div>
          {showTechTree ? <div className="tech-tree"><div className="subhead"><span>شجرة التطوير</span><small>المستوى العام 02</small></div><p className="tech-intro">استثمر الذهب لتقوية الوحدات. كل مستوى يرفع كفاءة الأوامر المرتبطة به.</p>{techNodes.map((node, index) => { const Icon = node.icon; const level = techLevels[node.id] ?? 0; return <div className={`tech-node has-tip ${level > 0 ? "researched" : ""}`} data-tip={`${node.title}: ${node.effect} · تكلفة المستوى ${node.cost.toLocaleString("en-US")} ذهب`} key={`tech-node-${node.id}`}><div className="tech-icon"><Icon size={17} /></div><div className="tech-copy"><b>{node.title}</b><small>{node.type} · {node.effect}</small><div className="tech-levels">{[0,1,2].map((step) => <i key={`tech-level-${node.id}-${step}`} className={step < level ? "filled" : ""} />)}</div></div><button onClick={() => research(node)} disabled={level >= 3}>{level >= 3 ? "مكتمل" : `${node.cost.toLocaleString("en-US")} ذهب`}</button>{index < techNodes.length - 1 && <span className="tech-connector" />}</div> })}</div> : <>
          <div className="city-list"><div className="subhead"><span>المحافظات والمدن</span><small>{selectedProvinces.length} مواقع</small></div>{selectedProvinces.map((province, index) => <button key={`${selected.id}-${province.name}`} className="city-row" onClick={() => toast.info(`${province.name}: ${province.city} · ${province.buildings.join(" / ")}`)}><span className="city-marker">{String(index + 1).padStart(2, "0")}</span><div><b>{province.name}</b><small>{province.city} · {province.role}</small></div><span className="city-health"><i style={{ width: `${province.health}%` }} /></span></button>)}</div>
          <div className="panel-block"><div className="subhead"><span>البنية التحتية</span><small>مفعلة</small></div><div className="infra-grid"><button className="has-tip" data-tip="زراعة: تزيد التجنيد بمقدار 18 جنديًا كل دقيقة · التكلفة 420 ذهب" title="زراعة: تزيد التجنيد بمقدار 18 جنديًا كل دقيقة · 420 ذهب" onClick={() => build("farms", 420, "وحدة زراعة")}><Wheat size={17} /><b>{builds.farms}</b><small>زراعة</small></button><button className="has-tip" data-tip="مصنع: يرفع الذهب المتولد · التكلفة 680 ذهب" title="مصنع: يرفع الذهب المتولد · 680 ذهب" onClick={() => build("factories", 680, "مصنع")}><Factory size={17} /><b>{builds.factories}</b><small>مصانع</small></button><button className="has-tip" data-tip="كوبري: يربط المدن ويرفع كفاءة الإمداد · التكلفة 520 ذهب" title="كوبري: يربط المدن ويرفع كفاءة الإمداد · 520 ذهب" onClick={() => build("bridges", 520, "كوبري")}><Wind size={17} /><b>{builds.bridges}</b><small>كباري</small></button><button className="has-tip" data-tip="مطار: يسمح بالطيران والتزود بالوقود والنقل · التكلفة 1,100 ذهب" title="مطار: يسمح بالطيران والتزود بالوقود والنقل · 1,100 ذهب" onClick={() => build("airports", 1100, "مطار")}><Plane size={17} /><b>{builds.airports}</b><small>مطارات</small></button></div></div></>}
          <div className="panel-block alliance-card"><div className="subhead"><span>حلف المتوسط</span><span className="ally-status">نشط</span></div><p>مطار إسطنبول متاح للهبوط والتزود بالوقود.</p><button className="danger-link" onClick={beginBreakAlliance}>{breakAllianceAt ? `فض التحالف ${formatTime(secondsLeft)}` : "بدء فض التحالف"}</button></div>
        </aside>
      </section>

      <section className="bottom-dock"><div className="resource-strip">{stats.map(({ label, value, delta, icon: Icon, tone }) => <div className="resource" key={label}><div className={`resource-icon ${tone}`}><Icon size={16} /></div><div><small>{label}</small><b>{value}</b><span>{delta}</span></div></div>)}</div><div className="quick-orders"><button className="critical-order has-tip" data-tip="هجوم بري: يرسل 48 جنديًا لاحتلال الدولة المحددة" onClick={attackSelected}><Swords size={17} /><span>بدء الهجوم</span><small>48 جندي</small></button><button className="has-tip" data-tip="طلب قوات: يضيف 36 جنديًا مقابل 800 ذهب" onClick={orderTroops}><Swords size={17} /><span>طلب قوات</span><small>800 ذهب</small></button><button className="has-tip" data-tip="إقلاع طائرة: يستهلك 14 وقودًا ويضيف وحدة جوية" onClick={launchPlane}><Plane size={17} /><span>إقلاع طائرة</span><small>14 وقود</small></button><button className="has-tip" data-tip="صاروخ تكتيكي: ضربة بعيدة المدى مقابل 1,200 ذهب" onClick={() => { addLog("تم إطلاق صاروخ تكتيكي نحو هدف محدد"); toast.warning("الصاروخ في طريقه إلى الهدف"); }}><Zap size={17} /><span>إطلاق صاروخ</span><small>1,200 ذهب</small></button><button className="has-tip" data-tip="الدفاع الجوي: يحمي القاهرة من الصواريخ والطائرات" onClick={() => toast.info("وضع الدفاع الجوي مفعل حول القاهرة") }><Radar size={17} /><span>الدفاع الجوي</span><small>جاهز</small></button></div></section>
      <section className="event-feed"><div className="event-feed-head"><div><span className="ticker-label">سجل الأحداث</span><small>تحديث مباشر · {filteredLogs.length} أحداث</small></div><div className="event-filters">{(["all", "attack", "alliance", "production", "defense"] as EventType[]).map((filter) => <button key={filter} className={eventFilter === filter ? "active" : ""} onClick={() => setEventFilter(filter)}>{filter === "all" ? "الكل" : eventLabels[filter]}</button>)}</div></div><div className="event-list">{filteredLogs.slice(0, 5).map((log, index) => <div className="event-row" key={`event-${log.id}-${log.time}-${index}`}><span className={`event-type ${eventColors[log.type]}`}>{eventLabels[log.type]}</span><time>{log.time}</time><span>{log.text}</span></div>)}</div></section>
    </main>
  );
}
