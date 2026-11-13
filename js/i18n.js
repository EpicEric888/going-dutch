/* ---------- language: English / Dutch ----------
   The app is written in English. In Dutch mode, every text node and placeholder/aria-label/title
   on the page is translated as React renders it, using NL (exact text) and NL_PATTERNS (text with
   numbers or names in it). Copied/shared text uses tl(en, nl) directly. */
const LANG_STORE = "goingdutch.lang";
const LANG = { code: (() => {
  try { const s = localStorage.getItem(LANG_STORE); if (s === "en" || s === "nl") return s; } catch (e) {}
  const first = (navigator.languages || [navigator.language || "en"])[0] || "en";
  return /^nl\b/i.test(first) ? "nl" : "en";
})() };
const tl = (en, nl) => (LANG.code === "nl" ? nl : en);
const LOCALE = () => (LANG.code === "nl" ? "nl-NL" : undefined);
function setLang(code) {
  try { localStorage.setItem(LANG_STORE, code); } catch (e) {}
  location.reload();
}

const NL = {
  // app shell
  "Pay for what you had. Share the rest fairly.": "Betaal wat je had. Deel de rest eerlijk.",
  "Privacy": "Privacy", "Terms": "Voorwaarden",
  "Getting things ready…": "Even geduld…",
  "Can't connect right now": "Geen verbinding",
  "Guest access is turned off for this site. The owner needs to allow anonymous sign-ins in Supabase.": "Gasttoegang staat uit voor deze site.",
  "Change theme": "Thema wijzigen", "Appearance": "Weergave", "Color": "Kleur",
  "Light": "Licht", "Dark": "Donker", "Auto": "Auto",
  "Emerald": "Smaragd", "Ocean": "Oceaan", "Plum": "Pruim", "Saffron": "Saffraan", "Graphite": "Grafiet",
  "Undo": "Ongedaan maken", "Copied": "Gekopieerd", "Copy": "Kopiëren", "Close": "Sluiten",
  "Cancel": "Annuleren", "Save": "Opslaan", "Done": "Klaar", "Edit": "Bewerken", "Back": "Terug",
  "Delete": "Verwijderen", "Remove": "Verwijderen", "Leave": "Verlaten", "Open": "Openen", "Join": "Meedoen",
  "Add": "Toevoegen", "Download": "Downloaden", "Send": "Versturen",

  // landing
  "Snap the receipt. Everyone taps what they had.": "Maak een foto van de bon. Iedereen tikt aan wat hij had.",
  "Tax, tip and fees get split fairly.": "Btw, fooi en kosten worden eerlijk verdeeld.",
  "Split a bill": "Rekening splitsen", "Try an example": "Probeer een voorbeeld",
  "+ tax & tip, split fairly": "+ btw & fooi, eerlijk verdeeld",
  "Burger": "Burger", "Fries to share": "Friet om te delen", "Margarita": "Margarita",
  "Snap the receipt": "Maak een foto van de bon", "We read the items for you": "Wij lezen de items voor je uit",
  "Share the link": "Deel de link", "Text it to the group": "Stuur hem naar de groep",
  "Everyone taps their items": "Iedereen tikt zijn items aan", "Totals update for all": "Totalen updaten voor iedereen",
  "Friends don't need an app or an account.": "Vrienden hebben geen app of account nodig.",
  "Paste a bill link from a friend": "Plak een link van een vriend", "Paste a bill link": "Plak een link",
  "That doesn't look like a Going Dutch link": "Dat lijkt geen Going Dutch-link",
  "My bills": "Mijn rekeningen", "No bills yet": "Nog geen rekeningen",
  "Start a new bill, or open a link a friend sent you. Bills you join show up here.": "Start een nieuwe rekening of open een link van een vriend. Rekeningen waar je aan meedoet zie je hier.",
  "Loading your bills…": "Je rekeningen laden…", "Untitled bill": "Naamloze rekening", "Settled": "Afgerekend",
  "Owed to you": "Jij krijgt nog", "You paid": "Jij betaalde", "You owe": "Jij moet nog",
  "Delete this bill for everyone?": "Deze rekening voor iedereen verwijderen?",
  "Leave this bill?": "Deze rekening verlaten?",
  "Bill deleted": "Rekening verwijderd", "You left the bill": "Je hebt de rekening verlaten",
  "Couldn't remove that bill. Try again.": "Kon de rekening niet verwijderen. Probeer het opnieuw.",
  "Couldn't create the bill. Try again.": "Kon de rekening niet maken. Probeer het opnieuw.",
  "Deletes it for everyone, with the receipt photo.": "Verwijdert hem voor iedereen, inclusief de foto van de bon.",
  "Removes it from your list. The link still works.": "Haalt hem uit je lijst. De link blijft werken.",
  "It disappears from your bills. You can rejoin with the link anytime.": "Hij verdwijnt uit je rekeningen. Je kunt altijd weer meedoen via de link.",
  "The bill, everyone's claims and the receipt photo are removed. This can't be undone.": "De rekening, alle claims en de foto van de bon worden verwijderd. Dit kan niet ongedaan worden gemaakt.",

  // account
  "Sign in": "Inloggen", "Sign out": "Uitloggen", "Signed out": "Uitgelogd", "Signed in as": "Ingelogd als",
  "You're a guest": "Je bent gast",
  "Your bills are saved on this device. Create an account to keep them on every device.": "Je rekeningen staan op dit apparaat. Maak een account om ze op elk apparaat te hebben.",
  "Continue with Google": "Doorgaan met Google", "or use email": "of gebruik e-mail",
  "Create account with email": "Account maken met e-mail", "Create your account": "Maak je account",
  "I already have one": "Ik heb al een account", "Email": "E-mail", "Email me a link": "Mail me een link",
  "We'll send a one-time sign-in link. No password.": "We sturen een eenmalige inloglink. Geen wachtwoord.",
  "Check your email": "Check je e-mail", "Open the link we sent to": "Open de link die we stuurden naar",
  "on this device to finish.": "op dit apparaat om af te ronden.",
  "No account with that email yet. Create one instead.": "Nog geen account met dat e-mailadres. Maak er een aan.",
  "Bills you already opened here stay with you.": "Rekeningen die je hier al opende blijven bij je.",
  "Your name": "Je naam", "Your name on new bills": "Je naam op nieuwe rekeningen", "What friends call you": "Hoe vrienden je noemen",
  "Name saved": "Naam opgeslagen", "Your session expired. Reload the page.": "Je sessie is verlopen. Herlaad de pagina.",
  "Email links can't open a file on your computer. Sign-in works once the site is online.": "Inloggen werkt zodra de site online staat.",

  // bill page
  "Setup": "Instellen", "Claim items": "Items claimen", "Summary": "Overzicht", "Bill sections": "Onderdelen",
  "Opening the bill…": "Rekening openen…", "This bill doesn't exist": "Deze rekening bestaat niet",
  "The link may be mistyped, or the bill was deleted.": "De link is misschien verkeerd, of de rekening is verwijderd.",
  "Go to my bills": "Naar mijn rekeningen", "Couldn't open this bill": "Kon deze rekening niet openen",
  "Check your connection and reload the page.": "Check je verbinding en herlaad de pagina.",
  "This is an example bill. Play with it, then start a real one.": "Dit is een voorbeeld. Speel ermee en start dan een echte.",
  "New bill": "Nieuwe rekening", "All claimed": "Alles geclaimd", "No items yet": "Nog geen items",
  "Share bill link": "Link delen", "View receipt photo": "Foto van de bon bekijken", "View receipt": "Bon bekijken",
  "Rename bill": "Naam wijzigen", "Lock bill (everyone's settled)": "Vergrendelen (iedereen heeft betaald)",
  "Unlock bill": "Ontgrendelen", "Delete bill": "Rekening verwijderen", "Leave bill": "Rekening verlaten",
  "Bill name": "Naam van de rekening", "Bill locked": "Rekening vergrendeld", "Bill unlocked": "Rekening ontgrendeld",
  "Couldn't change the lock. Try again.": "Kon de vergrendeling niet wijzigen. Probeer het opnieuw.",
  "This bill is locked": "Deze rekening is vergrendeld",
  "This bill is settled and locked, so nothing can be changed.": "Deze rekening is afgerekend en vergrendeld, dus er kan niets meer veranderen.",
  "Unlock it from the ⋯ menu if you need to.": "Ontgrendel hem via het ⋯-menu als dat nodig is.",
  "Locked": "Vergrendeld", "Share of items claimed": "Deel van de items geclaimd",
  "Couldn't save that change. Check your connection.": "Kon de wijziging niet opslaan. Check je verbinding.",
  "Receipt photo": "Foto van de bon", "Uploaded receipt": "Geüploade bon", "Loading photo…": "Foto laden…",
  "Open full size": "Volledig openen",
  "Couldn't load the photo. Check your connection and try again.": "Kon de foto niet laden. Check je verbinding en probeer het opnieuw.",

  // setup steps
  "Upload the receipt": "Upload de bon", "We read the line items, tax and fees for you.": "Wij lezen de items, btw en kosten voor je uit.",
  "Drop a receipt photo or PDF": "Sleep een foto of pdf van de bon hierheen", "or tap to choose · JPG, PNG, PDF": "of tik om te kiezen · JPG, PNG, PDF",
  "Reading your receipt…": "Je bon wordt gelezen…", "This usually takes 5 to 20 seconds.": "Dit duurt meestal 5 tot 20 seconden.",
  "Who's splitting?": "Wie doen er mee?", "2 to 12 people, including you. Rename, add or remove anyone.": "2 tot 12 mensen, inclusief jij. Hernoem, voeg toe of verwijder.",
  "Check the numbers": "Check de bedragen", "Fix anything the scan got wrong. Tax, fees and tip are split by what each person had.": "Verbeter wat de scan fout las. Btw, kosten en fooi worden verdeeld naar wat iedereen had.",
  "How should friends pay you?": "Hoe betalen vrienden je terug?", "Send the link": "Verstuur de link",
  "Add someone": "Iemand toevoegen", "New person's name": "Naam van de nieuwe persoon",
  "Tap someone's initials to select them": "Tik op iemands initialen om diegene te selecteren",
  "Mark as the one who paid": "Markeer als degene die betaalde", "Receipt owner": "Betaalde de rekening",
  "Host": "Betaler", "Unnamed": "Naamloos", "Someone": "Iemand", "This person": "Deze persoon",
  "Restaurant": "Restaurant", "Where did you eat?": "Waar heb je gegeten?", "Date": "Datum", "Currency": "Valuta",
  "Items": "Items", "Qty · Line total": "Aantal · Totaal", "Item name": "Naam item", "Quantity": "Aantal",
  "Line total": "Totaal", "Add item": "Item toevoegen", "Remove item": "Item verwijderen",
  "Untitled item": "Naamloos item", "Untitled": "Naamloos",
  "Subtotal": "Subtotaal", "Tax": "Btw", "Tip": "Fooi", "Tip type": "Soort fooi", "Fees": "Kosten",
  "Other fees": "Overige kosten", "Add fee": "Kosten toevoegen", "Fee name": "Naam kosten", "Fee amount": "Bedrag",
  "Remove fee": "Kosten verwijderen", "Service fee": "Servicekosten", "Fee": "Kosten",
  "No service, delivery or kitchen fees on this bill.": "Geen service-, bezorg- of keukenkosten op deze rekening.",
  "% of subtotal": "% van subtotaal", "Bill total": "Totaal", "Rounding": "Afronding",
  "The receipt's printed total is": "Het totaal op de bon is", ", but these numbers add up to": ", maar deze bedragen tellen op tot",
  ". Check the items and charges.": ". Check de items en kosten.",
  "Tikkie link": "Tikkie-link",
  "Saved for your next bills too": "Ook bewaard voor je volgende rekeningen",
  "Friends get one-tap buttons with their amount filled in. Fill in whichever you use.": "Vrienden krijgen knoppen met hun bedrag al ingevuld. Vul in wat jij gebruikt.",
  "In the Tikkie app, make one Tikkie for this dinner and leave the amount open. Paste its link here. Friends get a \"Pay with Tikkie\" button and see exactly how much to enter.": "Maak in de Tikkie-app één Tikkie voor dit etentje en laat het bedrag open. Plak de link hier. Vrienden krijgen een knop \"Betaal met Tikkie\" en zien precies welk bedrag ze moeten invullen.",
  "That doesn't look like a Tikkie link. It should start with https://tikkie.me/": "Dat lijkt geen Tikkie-link. Hij moet beginnen met https://tikkie.me/",
  "Anyone with the link can open this bill and claim what they had. No account needed. Friends who sign up keep all their bills in one place.": "Iedereen met de link kan deze rekening openen en claimen wat hij had. Geen account nodig. Vrienden met een account hebben al hun rekeningen op één plek.",
  "Send to the group": "Stuur naar de groep", "Link copied": "Link gekopieerd",
  "Invite copied. Paste it in your group chat.": "Uitnodiging gekopieerd. Plak hem in je groepsapp.",
  "Copy blocked": "Kopiëren geblokkeerd", "Copy blocked by this view": "Kopiëren geblokkeerd",
  "Copy blocked. Select the link instead.": "Kopiëren geblokkeerd. Selecteer de link.",
  "Copy blocked. Select the text instead.": "Kopiëren geblokkeerd. Selecteer de tekst.",

  // receipt reading
  "That file type isn't supported. Use a JPG, PNG or PDF.": "Dat bestandstype werkt niet. Gebruik JPG, PNG of PDF.",
  "That photo is too large. Try a smaller one.": "Die foto is te groot. Probeer een kleinere.",
  "We couldn't read that image. Try another photo.": "We konden die afbeelding niet lezen. Probeer een andere foto.",
  "Too many requests right now. Wait a minute and try again.": "Te veel verzoeken. Wacht even en probeer het opnieuw.",
  "We couldn't open that image. Try a clearer photo or a different file.": "We konden die afbeelding niet openen. Probeer een scherpere foto of een ander bestand.",
  "We couldn't make sense of that receipt. Try a sharper, straight-on photo, or type it in below.": "We konden die bon niet lezen. Probeer een scherpere foto recht van boven, of typ hem hieronder in.",
  "Receipt reading isn't switched on yet. Type the receipt in below.": "Bonnen lezen staat nog niet aan. Typ de bon hieronder in.",
  "Something went wrong reading the receipt. Try again, or type it in below.": "Er ging iets mis bij het lezen van de bon. Probeer het opnieuw of typ hem hieronder in.",
  "You've hit today's limit for receipt scans as a guest. Sign in for more, or type it in below.": "Je hebt als gast het maximum aantal scans voor vandaag bereikt. Log in voor meer, of typ de bon hieronder in.",
  "You've hit today's limit for receipt scans. Try again tomorrow, or type it in below.": "Je hebt het maximum aantal scans voor vandaag bereikt. Probeer het morgen opnieuw, of typ de bon hieronder in.",
  "Receipt reading is taking a break for today. Type the receipt in below.": "Bonnen lezen pauzeert voor vandaag. Typ de bon hieronder in.",

  // claiming
  "Who are you?": "Wie ben jij?", "Tap your name to see the bill and claim what you had.": "Tik op je naam om de rekening te zien en te claimen wat je had.",
  "Paid the bill": "Betaalde de rekening", "Picked on another phone": "Gekozen op een andere telefoon", "Tap to join": "Tik om mee te doen",
  "Not on the list? Add your name": "Sta je er niet bij? Voeg je naam toe",
  "My items": "Mijn items", "Everyone's": "Iedereen",
  "Not you?": "Niet jij?", "Hi": "Hoi", "there": "daar",
  "Tap everything you had. Shared something? Tap it too and it splits. Only had part, like half the fries? Pick how much after you tap.": "Tik alles aan wat je had. Iets gedeeld? Tik het ook aan, dan wordt het verdeeld. Maar een deel gehad, zoals de helft van de friet? Kies na het aantikken hoeveel.",
  "Shared with ": "Gedeeld met ", "Claimed by ": "Geclaimd door ", "Also: ": "Ook: ",
  "Just you": "Alleen jij", "Nobody yet": "Nog niemand", " left": " over",
  "How much did you have?": "Hoeveel had jij?", "How many did you have?": "Hoeveel had jij?",
  "Your portion": "Jouw deel", "All": "Alles", "One fewer": "Eén minder", "One more": "Eén meer",
  "Already claimed · ": "Al geclaimd · ", "Already claimed ·": "Al geclaimd ·", "Split it": "Delen",
  "I've paid": "Ik heb betaald", "Marked as paid": "Gemarkeerd als betaald", "Paid": "Betaald",
  "Who owes what": "Wie moet wat", "Joining as": "Ik ben",
  "Add or remove people": "Mensen toevoegen of verwijderen",
  "Tap an item to claim it for yourself. Tap a name chip to assign anyone.": "Tik op een item om het zelf te claimen. Tik op een naam om het aan iemand toe te wijzen.",
  "Pick who you are, or tap the name chips under each item.": "Kies wie je bent, of tik op de namen onder elk item.",
  "Add at least 2 people first": "Voeg eerst minstens 2 mensen toe", "Who was at the table?": "Wie zaten er aan tafel?",
  "Just split it evenly": "Gewoon gelijk verdelen", "Split evenly": "Gelijk verdeeld",
  "Split equally among all": "Gelijk verdelen over iedereen", "Everyone": "Iedereen",
  "Adjust portions": "Porties aanpassen", "Hide portions": "Porties verbergen", "How many each": "Hoeveel per persoon",
  "\"All\" from several people splits it evenly.": "\"Alles\" bij meerdere mensen verdeelt het gelijk.",
  "Unassigned": "Niet toegewezen", "Unclaimed": "Niet geclaimd", "Nothing claimed yet.": "Nog niets geclaimd.",
  ". Nobody pays for these until someone claims them.": ". Niemand betaalt hiervoor tot iemand ze claimt.",
  "unassigned item": "niet toegewezen item", "unassigned items": "niet toegewezen items", " worth ": " ter waarde van ",
  "Sam owes": "Sam moet", "owes": "moet",
  "Pay with Tikkie": "Betaal met Tikkie",
  "hasn't added how to pay them yet. Ask them, or settle up in person.": "heeft nog niet ingevuld hoe je kunt betalen. Vraag het, of reken persoonlijk af.",
  "The host": "De betaler",

  // summary
  "Settle up": "Afrekenen", "Mark as paid": "Markeer als betaald", "tap for math": "tik voor de berekening",
  "Copy summary": "Overzicht kopiëren", "Summary copied": "Overzicht gekopieerd", "Message copied": "Bericht gekopieerd",
  "Download PNG": "PNG downloaden", "Preparing image…": "Afbeelding maken…", "Image saved": "Afbeelding opgeslagen",
  "Press and hold or right-click to save": "Houd ingedrukt of klik rechts om op te slaan",
  "Your share": "Jouw deel", "owed to you": "krijg jij nog", "people · tip": "mensen · fooi", "· tax": "· btw",
  " · gets back": " · krijgt terug", "· gets back": "· krijgt terug", "· you paid": "· jij betaalde",
  "in items still unclaimed": "aan items nog niet geclaimd",
  "people": "mensen", "person": "persoon", "No date": "Geen datum",
};

const NL_PATTERNS = [
  [/^Everyone pays about (.+)\. You can still tweak items after\.$/, "Iedereen betaalt ongeveer $1. Je kunt daarna nog items aanpassen."],
  [/^Everyone pays (.+)\. Tap items below to change it\.$/, "Iedereen betaalt $1. Tik hieronder op items om het aan te passen."],
  [/^Shared by (\d+)$/, "Gedeeld door $1"],
  [/^Split evenly (\d+) ways$/, "Gelijk verdeeld over $1 mensen"],
  [/^Split with (.+)$/, "Gedeeld met $1"],
  [/^Owes (.+)$/, "Moet $1 betalen"],
  [/^Paid (.+) ✓$/, "$1 betaald ✓"],
  [/^Paid (.+)$/, "Betaalde $1"],
  [/^Remove (.+)$/, "Verwijder $1"],
  [/^One fewer for (.+)$/, "Eén minder voor $1"],
  [/^One more for (.+)$/, "Eén meer voor $1"],
  [/^Copy message for (.+)$/, "Bericht kopiëren voor $1"],
  [/^Read (\d+) items\. Check them below and fix anything that looks off\.$/, "$1 items gelezen. Check ze hieronder en verbeter wat niet klopt."],
  [/^Tikkie will ask for the amount\. Enter (.+)\.$/, "Tikkie vraagt om het bedrag. Vul $1 in."],
  [/^(.+) unclaimed$/, "$1 niet geclaimd"],
  [/^(\d+) people · tip (.+) · tax (.+)$/, "$1 mensen · fooi $2 · btw $3"],
  [/^Tax \((.+)\)$/, "Btw ($1)"],
  [/^you'd pay (.+)$/, "jij betaalt dan $1"],
  [/^of (.+)$/, "van $1"],
  [/^Pay buttons are available for dollar and euro bills\. For (\w+), friends will see what they owe and can pay you however you usually do\.$/, "Betaalknoppen zijn er voor rekeningen in dollars en euro's. Bij $1 zien vrienden wat ze moeten betalen en betalen ze je zoals jullie gewend zijn."],
  [/^(.+) hasn't added how to pay them yet\. Ask them, or settle up in person\.$/, "$1 heeft nog niet ingevuld hoe je kunt betalen. Vraag het, of reken persoonlijk af."],
  [/^Shared with (.+)$/, "Gedeeld met $1"],
  [/^Claimed by (.+)$/, "Geclaimd door $1"],
  [/^Also: (.+)$/, "Ook: $1"],
  [/^Hi (.+)$/, "Hoi $1"],
  [/^(.+) of 12 people · tap the wallet to change who paid$/, "$1 van 12 mensen · tik op de portemonnee om te wijzigen wie betaalde"],
];

const NLT = Object.fromEntries(Object.entries(NL).map(([k, v]) => [k.trim(), v.trim()]));
function trText(s) {
  if (LANG.code !== "nl" || !s) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const core = m[2];
  if (!core) return s;
  if (Object.prototype.hasOwnProperty.call(NLT, core)) return m[1] + NLT[core] + m[3];
  for (const [re, out] of NL_PATTERNS) if (re.test(core)) return m[1] + core.replace(re, out) + m[3];
  return s;
}

(function startTranslator() {
  document.documentElement.lang = LANG.code;
  if (LANG.code !== "nl") return;
  const ATTRS = ["placeholder", "aria-label", "title"];
  const skip = el => !el || el.closest?.("[translate=no], textarea, script, style");
  const doText = n => { if (skip(n.parentElement)) return; const v = n.nodeValue, t = trText(v); if (t !== v) n.nodeValue = t; };
  const doAttrs = el => { for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v) { const t = trText(v); if (t !== v) el.setAttribute(a, t); } } };
  const walk = root => {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  };
  const obs = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  const go = () => { walk(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); };
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
})();

function LangToggle() {
  const next = LANG.code === "nl" ? "en" : "nl";
  return html`<button type="button" onClick=${() => setLang(next)} translate="no"
    aria-label=${LANG.code === "nl" ? "Taal: Nederlands. Switch to English" : "Language: English. Schakel naar Nederlands"}
    title=${LANG.code === "nl" ? "Switch to English" : "Nederlands"}
    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-card text-ink text-xs font-bold hover:bg-soft">
    ${LANG.code === "nl" ? "NL" : "EN"}
  </button>`;
}
