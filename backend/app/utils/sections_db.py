"""Hardcoded IPC / BNS / CrPC sections database for Indian legal system."""

from typing import Optional


class SectionInfo:
    __slots__ = ("code", "section", "title", "max_punishment", "bailable", "cognizable", "over_7_years")

    def __init__(self, code: str, section: str, title: str, max_punishment: str,
                 bailable: bool, cognizable: bool, over_7_years: bool):
        self.code = code
        self.section = section
        self.title = title
        self.max_punishment = max_punishment
        self.bailable = bailable
        self.cognizable = cognizable
        self.over_7_years = over_7_years

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "section": self.section,
            "title": self.title,
            "maxPunishment": self.max_punishment,
            "bailable": self.bailable,
            "cognizable": self.cognizable,
            "over7Years": self.over_7_years,
        }


# Key: normalised lookup string (e.g. "302", "498a", "420")
_SECTIONS_DB: dict[str, SectionInfo] = {}


def _add(code: str, section: str, title: str, max_punishment: str,
         bailable: bool, cognizable: bool, over_7_years: bool):
    key = section.lower().replace(" ", "")
    _SECTIONS_DB[key] = SectionInfo(code, section, title, max_punishment, bailable, cognizable, over_7_years)
    # Also store with code prefix for lookup like "ipc 302"
    _SECTIONS_DB[f"{code.lower()}{key}"] = _SECTIONS_DB[key]


# ── IPC Sections ──────────────────────────────────────────────

_add("IPC", "120B", "Criminal Conspiracy", "Same as abetted offence", False, True, True)
_add("IPC", "147", "Rioting", "2 years", True, True, False)
_add("IPC", "148", "Rioting armed with deadly weapon", "3 years", True, True, False)
_add("IPC", "149", "Unlawful assembly — every member guilty", "Same as offence committed", False, True, True)
_add("IPC", "153A", "Promoting enmity between groups", "3 years", False, True, False)
_add("IPC", "186", "Obstructing public servant", "3 months", True, False, False)
_add("IPC", "189", "Threat of injury to public servant", "2 years", True, False, False)
_add("IPC", "191", "Giving false evidence", "7 years", False, True, True)
_add("IPC", "193", "False evidence in judicial proceeding", "7 years", False, True, True)
_add("IPC", "195A", "Threatening witness", "7 years", False, True, True)
_add("IPC", "201", "Causing disappearance of evidence", "7 years", False, True, True)
_add("IPC", "211", "False charge of offence", "7 years", False, True, True)
_add("IPC", "212", "Harbouring offender", "Same as principal offence", False, True, True)
_add("IPC", "216", "Harbouring offender escaped from custody", "7 years", False, True, True)
_add("IPC", "279", "Rash driving on public way", "6 months", True, True, False)
_add("IPC", "295A", "Outraging religious feelings", "3 years", False, True, False)
_add("IPC", "299", "Culpable homicide", "Life or 10 years", False, True, True)
_add("IPC", "300", "Murder (definition)", "Death or Life", False, True, True)
_add("IPC", "302", "Murder", "Death or Life imprisonment", False, True, True)
_add("IPC", "304", "Culpable homicide not amounting to murder", "Life or 10 years", False, True, True)
_add("IPC", "304A", "Death by negligence", "2 years", True, False, False)
_add("IPC", "304B", "Dowry death", "7 years to Life", False, True, True)
_add("IPC", "306", "Abetment of suicide", "10 years", False, True, True)
_add("IPC", "307", "Attempt to murder", "Life imprisonment", False, True, True)
_add("IPC", "308", "Attempt to commit culpable homicide", "7 years", False, True, True)
_add("IPC", "309", "Attempt to commit suicide", "1 year", True, False, False)
_add("IPC", "312", "Causing miscarriage", "3 years", False, True, False)
_add("IPC", "317", "Exposure and abandonment of child", "7 years", False, True, True)
_add("IPC", "323", "Voluntarily causing hurt", "1 year", True, False, False)
_add("IPC", "324", "Voluntarily causing hurt by dangerous weapon", "3 years", False, True, False)
_add("IPC", "325", "Voluntarily causing grievous hurt", "7 years", False, True, True)
_add("IPC", "326", "Voluntarily causing grievous hurt by dangerous weapon", "Life or 10 years", False, True, True)
_add("IPC", "332", "Voluntarily causing hurt to deter public servant", "3 years", False, True, False)
_add("IPC", "341", "Wrongful restraint", "1 month", True, False, False)
_add("IPC", "342", "Wrongful confinement", "1 year", True, False, False)
_add("IPC", "354", "Assault on woman with intent to outrage modesty", "5 years", False, True, False)
_add("IPC", "354A", "Sexual harassment", "3 years", False, True, False)
_add("IPC", "354B", "Assault with intent to disrobe", "7 years", False, True, True)
_add("IPC", "354C", "Voyeurism", "3 years", False, True, False)
_add("IPC", "354D", "Stalking", "3 years", False, True, False)
_add("IPC", "363", "Kidnapping", "7 years", False, True, True)
_add("IPC", "364", "Kidnapping for murder", "Death or Life", False, True, True)
_add("IPC", "365", "Kidnapping for secretly confining", "7 years", False, True, True)
_add("IPC", "366", "Kidnapping woman to compel marriage", "10 years", False, True, True)
_add("IPC", "376", "Rape", "10 years to Life", False, True, True)
_add("IPC", "377", "Unnatural offences", "Life or 10 years", False, True, True)
_add("IPC", "379", "Theft", "3 years", False, True, False)
_add("IPC", "380", "Theft in dwelling house", "7 years", False, True, True)
_add("IPC", "382", "Theft after preparation for causing death/hurt", "10 years", False, True, True)
_add("IPC", "384", "Extortion", "3 years", False, True, False)
_add("IPC", "386", "Extortion by putting in fear of death", "10 years", False, True, True)
_add("IPC", "392", "Robbery", "10 years", False, True, True)
_add("IPC", "395", "Dacoity", "Life imprisonment", False, True, True)
_add("IPC", "397", "Robbery or dacoity with attempt to cause death/grievous hurt", "Life or 10 years minimum", False, True, True)
_add("IPC", "406", "Criminal breach of trust", "3 years", False, True, False)
_add("IPC", "409", "Criminal breach of trust by public servant/banker", "Life or 10 years", False, True, True)
_add("IPC", "411", "Dishonestly receiving stolen property", "3 years", False, True, False)
_add("IPC", "414", "Assisting in concealment of stolen property", "3 years", False, True, False)
_add("IPC", "415", "Cheating (definition)", "—", False, True, False)
_add("IPC", "417", "Cheating", "1 year", True, False, False)
_add("IPC", "418", "Cheating with knowledge of wrongful loss", "3 years", False, True, False)
_add("IPC", "420", "Cheating and dishonestly inducing delivery of property", "7 years", False, True, True)
_add("IPC", "426", "Mischief", "3 months", True, False, False)
_add("IPC", "427", "Mischief causing damage", "2 years", False, True, False)
_add("IPC", "428", "Mischief by killing or maiming animal", "5 years", False, True, False)
_add("IPC", "435", "Mischief by fire", "7 years", False, True, True)
_add("IPC", "447", "Criminal trespass", "3 months", True, False, False)
_add("IPC", "448", "House-trespass", "1 year", True, False, False)
_add("IPC", "452", "House-trespass with assault", "7 years", False, True, True)
_add("IPC", "457", "Lurking house-trespass by night for committing offence", "5 years", False, True, False)
_add("IPC", "467", "Forgery of valuable security", "Life or 10 years", False, True, True)
_add("IPC", "468", "Forgery for purpose of cheating", "7 years", False, True, True)
_add("IPC", "471", "Using forged document as genuine", "Same as making it", False, True, True)
_add("IPC", "489A", "Counterfeiting currency notes", "Life imprisonment", False, True, True)
_add("IPC", "494", "Marrying again during lifetime of husband/wife", "7 years", False, True, True)
_add("IPC", "498A", "Cruelty by husband or relatives", "3 years", False, True, False)
_add("IPC", "499", "Defamation (definition)", "—", True, False, False)
_add("IPC", "500", "Defamation", "2 years", True, False, False)
_add("IPC", "504", "Intentional insult with intent to provoke breach of peace", "2 years", True, False, False)
_add("IPC", "506", "Criminal intimidation", "2 years (7 years if death threat)", True, False, False)
_add("IPC", "509", "Word, gesture or act intended to insult modesty of woman", "3 years", False, True, False)

# ── CrPC Sections ─────────────────────────────────────────────

_add("CrPC", "41", "When police may arrest without warrant", "—", False, True, False)
_add("CrPC", "41A", "Notice of appearance before police officer", "—", False, False, False)
_add("CrPC", "154", "Information in cognizable cases (FIR)", "—", False, False, False)
_add("CrPC", "161", "Examination of witnesses by police", "—", False, False, False)
_add("CrPC", "164", "Recording of confessions and statements", "—", False, False, False)
_add("CrPC", "167", "Procedure when investigation not completed in 24 hours", "—", False, False, False)
_add("CrPC", "167(2)", "Default bail — charge sheet not filed in time", "—", False, False, False)
_add("CrPC", "173", "Report of police officer on completion of investigation (Charge Sheet)", "—", False, False, False)
_add("CrPC", "190", "Cognizance of offences by Magistrate", "—", False, False, False)
_add("CrPC", "197", "Prosecution of public servants", "—", False, False, False)
_add("CrPC", "200", "Examination of complainant", "—", False, False, False)
_add("CrPC", "227", "Discharge", "—", False, False, False)
_add("CrPC", "228", "Framing of charge", "—", False, False, False)
_add("CrPC", "239", "When accused shall be discharged", "—", False, False, False)
_add("CrPC", "300", "Person once convicted or acquitted not to be tried for same offence", "—", False, False, False)
_add("CrPC", "309", "Power to postpone or adjourn proceedings", "—", False, False, False)
_add("CrPC", "313", "Power to examine accused", "—", False, False, False)
_add("CrPC", "378", "Appeal against acquittal", "—", False, False, False)
_add("CrPC", "389", "Suspension of sentence pending appeal", "—", False, False, False)
_add("CrPC", "436", "Person accused of bailable offence — bail", "—", True, False, False)
_add("CrPC", "437", "Non-bailable offences — bail", "—", False, True, False)
_add("CrPC", "438", "Anticipatory bail", "—", False, False, False)
_add("CrPC", "439", "Regular bail by Sessions Court / High Court", "—", False, False, False)
_add("CrPC", "482", "Inherent powers of High Court", "—", False, False, False)

# ── Dowry Prohibition Act ────────────────────────────────────

_add("DPA", "3", "Penalty for giving or taking dowry", "5 years + fine", False, True, False)
_add("DPA", "4", "Penalty for demanding dowry", "2 years + fine", False, True, False)

# ── POCSO ─────────────────────────────────────────────────────

_add("POCSO", "4", "Penetrative sexual assault on child", "10 years to Life", False, True, True)
_add("POCSO", "6", "Aggravated penetrative sexual assault", "20 years to Life", False, True, True)
_add("POCSO", "8", "Sexual assault on child", "5 years", False, True, False)
_add("POCSO", "10", "Aggravated sexual assault", "7 years", False, True, True)
_add("POCSO", "12", "Sexual harassment of child", "3 years", False, True, False)

# ── SC/ST Act ─────────────────────────────────────────────────

_add("SC/ST Act", "3(1)", "Offences of atrocities", "5 years", False, True, False)
_add("SC/ST Act", "3(2)", "Aggravated offences", "Life imprisonment", False, True, True)

# ── NDPS Act ──────────────────────────────────────────────────

_add("NDPS", "20", "Cannabis possession/use", "1-10 years (small), 10-20 years (commercial)", False, True, True)
_add("NDPS", "21", "Manufactured drugs", "1-10 years (small), 10-20 years (commercial)", False, True, True)
_add("NDPS", "22", "Psychotropic substances", "1-10 years (small), 10-20 years (commercial)", False, True, True)
_add("NDPS", "27", "Consumption of narcotic drug", "1 year (cannabis), 6 months (others)", True, True, False)

# ── IT Act ────────────────────────────────────────────────────

_add("IT Act", "66", "Computer related offences", "3 years", True, True, False)
_add("IT Act", "66A", "Publishing offensive material (struck down)", "3 years", True, True, False)
_add("IT Act", "67", "Publishing obscene material electronically", "5 years", False, True, False)

# ── BNS (Bharatiya Nyaya Sanhita) ────────────────────────────

_add("BNS", "100", "Culpable homicide", "Life or 10 years", False, True, True)
_add("BNS", "101", "Murder", "Death or Life imprisonment", False, True, True)
_add("BNS", "103", "Murder (punishment)", "Death or Life imprisonment", False, True, True)
_add("BNS", "105", "Culpable homicide not amounting to murder", "Life or 10 years", False, True, True)
_add("BNS", "108", "Abetment of suicide", "10 years", False, True, True)
_add("BNS", "109", "Attempt to murder", "Life imprisonment", False, True, True)
_add("BNS", "115", "Voluntarily causing hurt", "1 year", True, False, False)
_add("BNS", "117", "Voluntarily causing grievous hurt", "7 years", False, True, True)
_add("BNS", "303", "Theft", "3 years", False, True, False)
_add("BNS", "308", "Extortion", "3 years", False, True, False)
_add("BNS", "309", "Robbery", "10 years", False, True, True)
_add("BNS", "316", "Criminal breach of trust", "3 years", False, True, False)
_add("BNS", "318", "Cheating", "1 year", True, False, False)
_add("BNS", "319", "Cheating by personation", "5 years", False, True, False)
_add("BNS", "85", "Cruelty by husband or relatives", "3 years", False, True, False)
_add("BNS", "63", "Rape", "10 years to Life", False, True, True)


def lookup_section(raw: str) -> Optional[dict]:
    """Look up a section by its raw string (e.g. '302', 'IPC 302', '498A', 'CrPC 167(2)')."""
    cleaned = raw.strip().lower().replace(" ", "").replace("sec.", "").replace("section", "")
    # Try direct lookup
    if cleaned in _SECTIONS_DB:
        return _SECTIONS_DB[cleaned].to_dict()
    # Try without IPC/BNS prefix
    for prefix in ("ipc", "bns", "crpc", "dpa", "pocso", "ndps", "itact", "sc/stact"):
        if cleaned.startswith(prefix):
            remainder = cleaned[len(prefix):]
            if remainder in _SECTIONS_DB:
                return _SECTIONS_DB[remainder].to_dict()
    return None


def classify_sections(sections: list[str]) -> list[dict]:
    """Classify a list of section strings, returning info for each."""
    results = []
    for s in sections:
        info = lookup_section(s)
        if info:
            results.append(info)
        else:
            results.append({
                "code": "Unknown",
                "section": s,
                "title": f"Section {s}",
                "maxPunishment": "—",
                "bailable": False,
                "cognizable": False,
                "over7Years": False,
            })
    return results
