# Boxly — Brand

## Identità
- **Nome**: Boxly
- **Payoff**: *Sai sempre cosa c'è dentro.*
- **Cos'è**: l'app per catalogare ciò che metti nelle scatole (cambio stagione, trasloco, cantina)
  e ritrovarlo con un QR.
- **Per chi**: persone e famiglie che stivano oggetti e vogliono ritrovarli senza aprire dieci scatole.

## Tono di voce
- Italiano, informale (tu), frasi brevi, verbi d'azione: "Aggiungi un capo", "Stampa l'etichetta".
- Rassicurante e ordinato, mai tecnico. Niente gergo ("record", "entità", "upload" → "foto caricata").
- Stati vuoti incoraggianti: "Ancora nessuna scatola. Creane una e inizia a riempirla."
- Errori chiari e con via d'uscita: "Non riesco a caricare la foto. Riprova o salva senza foto."

## Palette
| Token | Chiaro | Scuro | Uso |
|---|---|---|---|
| `background` | `#FAF7F2` | `#15130F` | sfondo schermate |
| `surface` | `#FFFFFF` | `#1F1C17` | card, sheet, input |
| `text` | `#1E1B16` | `#F3EEE6` | testo principale |
| `textMuted` | `#6B645A` | `#A39B8F` | testo secondario, placeholder |
| `border` | `#E7E0D5` | `#2E2A23` | bordi, divisori |
| `primary` (Kraft) | `#B8742F` | `#D9995A` | pulsanti primari, scatole |
| `onPrimary` | `#FFFFFF` | `#15130F` | testo su primary |
| `accent` (Teal) | `#1F7A6D` | `#3FB3A2` | QR, scanner, link, badge ruolo |
| `danger` | `#B42318` | `#F97066` | elimina, revoca |
| `success` | `#2F7D32` | `#6CC070` | conferme |

Colori per stagione (badge): primavera `#7FB069`, estate `#F2B134`, autunno `#C8553D`,
inverno `#4A7FB5`, tutto l'anno `#8A8178`.

## Tipografia
- Font: **Inter** (`@expo-google-fonts/inter`): 400 testo, 600 titoli e pulsanti, 700 titolo schermata.
- Scala: 28 titolo schermata · 20 titolo sezione · 16 corpo · 14 secondario · 12 etichette.

## Forme e componenti
- Raggio: 12 card/input, 999 badge e pulsanti pill.
- Spaziatura base 4: padding schermata 16, gap tra card 12.
- Card scatola: icona scatola Kraft, nome, luogo, numero oggetti, badge stagione, badge ruolo se condivisa.
- Pulsante primario pieno Kraft; secondario con bordo; distruttivo testo `danger`.

## Logo e icona
- Simbolo: scatola di cartone vista di 3/4 con un QR stilizzato sul fianco; linee pulite, 2 colori (Kraft + Teal).
- Icona app: simbolo bianco su fondo Kraft `#B8742F`, angoli gestiti dalla piattaforma.
- Wordmark: "Boxly" in Inter 700, la "o" può richiamare il quadrato del QR.

## Etichetta QR stampabile
Formato 6×6 cm: QR al centro (codifica `boxly://box/<id>`), sotto nome scatola in grassetto,
luogo e stagione in piccolo, wordmark "Boxly" in basso.
