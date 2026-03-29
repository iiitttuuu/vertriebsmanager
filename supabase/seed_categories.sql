-- Seed: Standard-Hauptkategorien, Themenbereiche und Themen fuer Vertriebsmanager
-- Fuehrt die komplette Katalogstruktur ein und laesst bestehende Mitarbeiter/Anbieter unveraendert.

insert into public.app_state (id, payload, updated_at)
values (
  'main',
  '{"sessionUserId":"","users":[],"providers":[],"categories":[]}'::jsonb,
  now()
)
on conflict (id) do nothing;

update public.app_state
set payload = jsonb_set(
    coalesce(payload, '{}'::jsonb),
    '{categories}',
    '[
  {
    "id": "cat_familie_kinder",
    "name": "Familie & Kinder",
    "subcategories": [
      {
        "id": "sub_kinderkurse_aktivitaeten",
        "name": "Kinderkurse & Aktivitäten",
        "topics": [
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_001",
            "name": "Schwimmkurs Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_002",
            "name": "Kinderturnen"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_003",
            "name": "Tanzkurs Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_004",
            "name": "Malkurs Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_005",
            "name": "Musikunterricht Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_006",
            "name": "Theaterkurs Kinder"
          }
        ]
      },
      {
        "id": "sub_kreativitaet_basteln_kinder",
        "name": "Kreativität & Basteln für Kinder",
        "topics": [
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_001",
            "name": "Bastelkurs Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_002",
            "name": "Malen für Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_003",
            "name": "Töpfern Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_004",
            "name": "DIY Projekte Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_005",
            "name": "Zeichnen lernen Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_006",
            "name": "Handwerken Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_007",
            "name": "Nähen für Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_008",
            "name": "Kreativ Workshop Familie"
          }
        ]
      },
      {
        "id": "sub_sport_bewegung_kinder",
        "name": "Sport & Bewegung für Kinder",
        "topics": [
          {
            "id": "topic_sub_sport_bewegung_kinder_001",
            "name": "Fußballtraining Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_002",
            "name": "Kampfsport Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_003",
            "name": "Yoga für Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_004",
            "name": "Klettern Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_005",
            "name": "Reiten Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_006",
            "name": "Ballett Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_007",
            "name": "Leichtathletik Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_008",
            "name": "Bewegung & Motorik"
          }
        ]
      },
      {
        "id": "sub_baby_kleinkind",
        "name": "Baby & Kleinkind",
        "topics": [
          {
            "id": "topic_sub_baby_kleinkind_001",
            "name": "Baby Massage"
          },
          {
            "id": "topic_sub_baby_kleinkind_002",
            "name": "Eltern-Kind Turnen"
          },
          {
            "id": "topic_sub_baby_kleinkind_003",
            "name": "Frühförderung"
          },
          {
            "id": "topic_sub_baby_kleinkind_004",
            "name": "Spielgruppen"
          },
          {
            "id": "topic_sub_baby_kleinkind_005",
            "name": "Babyschwimmen"
          },
          {
            "id": "topic_sub_baby_kleinkind_006",
            "name": "Musik für Babys"
          },
          {
            "id": "topic_sub_baby_kleinkind_007",
            "name": "Erste Hilfe am Kind"
          },
          {
            "id": "topic_sub_baby_kleinkind_008",
            "name": "Schlafberatung Baby"
          }
        ]
      },
      {
        "id": "sub_elternkurse_coaching",
        "name": "Elternkurse & Coaching",
        "topics": [
          {
            "id": "topic_sub_elternkurse_coaching_001",
            "name": "Elterncoaching"
          },
          {
            "id": "topic_sub_elternkurse_coaching_002",
            "name": "Erziehungskurse"
          },
          {
            "id": "topic_sub_elternkurse_coaching_003",
            "name": "Kommunikation mit Kindern"
          },
          {
            "id": "topic_sub_elternkurse_coaching_004",
            "name": "Konflikte lösen Familie"
          },
          {
            "id": "topic_sub_elternkurse_coaching_005",
            "name": "Pubertät verstehen"
          },
          {
            "id": "topic_sub_elternkurse_coaching_006",
            "name": "Stressmanagement Eltern"
          },
          {
            "id": "topic_sub_elternkurse_coaching_007",
            "name": "Vereinbarkeit Familie & Beruf"
          },
          {
            "id": "topic_sub_elternkurse_coaching_008",
            "name": "Achtsamkeit für Eltern"
          }
        ]
      },
      {
        "id": "sub_freizeit_ausfluege_kinder",
        "name": "Freizeit & Ausflüge mit Kindern",
        "topics": [
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_001",
            "name": "Indoor Spielplatz"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_002",
            "name": "Freizeitpark Besuch"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_003",
            "name": "Zoo Erlebnis"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_004",
            "name": "Bauernhof Erlebnis"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_005",
            "name": "Familienausflug Natur"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_006",
            "name": "Erlebnispark"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_007",
            "name": "Kindergeburtstag Aktivitäten"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_008",
            "name": "Ferienprogramme"
          }
        ]
      },
      {
        "id": "sub_gemeinsame_familienerlebnisse",
        "name": "Gemeinsame Familienerlebnisse",
        "topics": [
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_001",
            "name": "Outdoor Abenteuer Familie"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_002",
            "name": "Familien Fotoshooting"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_003",
            "name": "Kurzurlaub Familie"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_lernen_weiterbildung",
    "name": "Lernen & Weiterbildung",
    "subcategories": [
      {
        "id": "sub_sprachen_lernen",
        "name": "Sprachen lernen",
        "topics": [
          {
            "id": "topic_sub_sprachen_lernen_001",
            "name": "Englisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_002",
            "name": "Deutsch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_003",
            "name": "Spanisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_004",
            "name": "Französisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_005",
            "name": "Italienisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_006",
            "name": "Business Englisch"
          },
          {
            "id": "topic_sub_sprachen_lernen_007",
            "name": "Konversationskurs"
          },
          {
            "id": "topic_sub_sprachen_lernen_008",
            "name": "Sprachzertifikat Vorbereitung"
          }
        ]
      },
      {
        "id": "sub_programmieren_it",
        "name": "Programmieren & IT",
        "topics": [
          {
            "id": "topic_sub_programmieren_it_001",
            "name": "Python programmieren"
          },
          {
            "id": "topic_sub_programmieren_it_002",
            "name": "Webentwicklung (HTML, CSS)"
          },
          {
            "id": "topic_sub_programmieren_it_003",
            "name": "JavaScript lernen"
          },
          {
            "id": "topic_sub_programmieren_it_004",
            "name": "App Entwicklung"
          },
          {
            "id": "topic_sub_programmieren_it_005",
            "name": "Data Science Grundlagen"
          },
          {
            "id": "topic_sub_programmieren_it_006",
            "name": "Künstliche Intelligenz"
          },
          {
            "id": "topic_sub_programmieren_it_007",
            "name": "Cloud Computing"
          },
          {
            "id": "topic_sub_programmieren_it_008",
            "name": "IT Grundlagen"
          }
        ]
      },
      {
        "id": "sub_business_buero_skills",
        "name": "Business & Büro Skills",
        "topics": [
          {
            "id": "topic_sub_business_buero_skills_001",
            "name": "Excel Kurs"
          },
          {
            "id": "topic_sub_business_buero_skills_002",
            "name": "PowerPoint Training"
          },
          {
            "id": "topic_sub_business_buero_skills_003",
            "name": "Projektmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_004",
            "name": "Zeitmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_005",
            "name": "Prozessmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_006",
            "name": "Business Analyse"
          },
          {
            "id": "topic_sub_business_buero_skills_007",
            "name": "MS Office Grundlagen"
          },
          {
            "id": "topic_sub_business_buero_skills_008",
            "name": "Organisation im Büro"
          }
        ]
      },
      {
        "id": "sub_marketing_online_business",
        "name": "Marketing & Online Business",
        "topics": [
          {
            "id": "topic_sub_marketing_online_business_001",
            "name": "SEO lernen"
          },
          {
            "id": "topic_sub_marketing_online_business_002",
            "name": "Google Ads (SEA)"
          },
          {
            "id": "topic_sub_marketing_online_business_003",
            "name": "Social Media Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_004",
            "name": "Content Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_005",
            "name": "E-Mail Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_006",
            "name": "Performance Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_007",
            "name": "Influencer Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_008",
            "name": "Online Business aufbauen"
          }
        ]
      },
      {
        "id": "sub_design_foto_video",
        "name": "Design, Foto & Video",
        "topics": [
          {
            "id": "topic_sub_design_foto_video_001",
            "name": "Fotografie Grundlagen"
          },
          {
            "id": "topic_sub_design_foto_video_002",
            "name": "Bildbearbeitung (Photoshop, Lightroom...)"
          },
          {
            "id": "topic_sub_design_foto_video_003",
            "name": "Grafikdesign"
          },
          {
            "id": "topic_sub_design_foto_video_004",
            "name": "Videobearbeitung"
          },
          {
            "id": "topic_sub_design_foto_video_005",
            "name": "Content Creation"
          },
          {
            "id": "topic_sub_design_foto_video_006",
            "name": "UI/UX Design"
          },
          {
            "id": "topic_sub_design_foto_video_007",
            "name": "Illustration"
          },
          {
            "id": "topic_sub_design_foto_video_008",
            "name": "Social Media Content erstellen"
          }
        ]
      },
      {
        "id": "sub_schule_nachhilfe",
        "name": "Schule & Nachhilfe",
        "topics": [
          {
            "id": "topic_sub_schule_nachhilfe_001",
            "name": "Mathe Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_002",
            "name": "Deutsch Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_003",
            "name": "Englisch Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_004",
            "name": "Physik Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_005",
            "name": "Chemie Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_006",
            "name": "Lerntechniken"
          },
          {
            "id": "topic_sub_schule_nachhilfe_007",
            "name": "Hausaufgabenhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_008",
            "name": "Prüfungsvorbereitung Schule"
          }
        ]
      },
      {
        "id": "sub_studium_akademische_skills",
        "name": "Studium & akademische Skills",
        "topics": [
          {
            "id": "topic_sub_studium_akademische_skills_001",
            "name": "Wissenschaftliches Arbeiten"
          },
          {
            "id": "topic_sub_studium_akademische_skills_002",
            "name": "Bachelorarbeit schreiben"
          },
          {
            "id": "topic_sub_studium_akademische_skills_003",
            "name": "Masterarbeit schreiben"
          },
          {
            "id": "topic_sub_studium_akademische_skills_004",
            "name": "Statistik Grundlagen"
          },
          {
            "id": "topic_sub_studium_akademische_skills_005",
            "name": "Präsentationen halten"
          },
          {
            "id": "topic_sub_studium_akademische_skills_006",
            "name": "Recherche Methoden"
          },
          {
            "id": "topic_sub_studium_akademische_skills_007",
            "name": "Zeitmanagement im Studium"
          },
          {
            "id": "topic_sub_studium_akademische_skills_008",
            "name": "Prüfungsvorbereitung Uni"
          }
        ]
      },
      {
        "id": "sub_kommunikation_persoenliche_skills",
        "name": "Kommunikation & persönliche Skills",
        "topics": [
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_001",
            "name": "Kommunikation verbessern"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_002",
            "name": "Rhetorik Training"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_003",
            "name": "Selbstbewusstsein stärken"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_004",
            "name": "Konfliktmanagement"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_005",
            "name": "Verhandlungstechniken"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_006",
            "name": "Körpersprache verstehen"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_007",
            "name": "Entscheidungsfindung"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_008",
            "name": "Kritikfähigkeit"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_erlebnisse_aktivitaeten",
    "name": "Erlebnisse & Aktivitäten",
    "subcategories": [
      {
        "id": "sub_abenteuer",
        "name": "Abenteuer",
        "topics": [
          {
            "id": "topic_sub_abenteuer_001",
            "name": "Fallschirmsprung"
          },
          {
            "id": "topic_sub_abenteuer_002",
            "name": "Bungee Jumping"
          },
          {
            "id": "topic_sub_abenteuer_003",
            "name": "Canyoning"
          },
          {
            "id": "topic_sub_abenteuer_004",
            "name": "Rafting"
          },
          {
            "id": "topic_sub_abenteuer_005",
            "name": "Klettersteig"
          },
          {
            "id": "topic_sub_abenteuer_006",
            "name": "Survival Training"
          },
          {
            "id": "topic_sub_abenteuer_007",
            "name": "Höhlentour"
          },
          {
            "id": "topic_sub_abenteuer_008",
            "name": "Base Jump"
          }
        ]
      },
      {
        "id": "sub_outdoor_natur",
        "name": "Outdoor & Natur",
        "topics": [
          {
            "id": "topic_sub_outdoor_natur_001",
            "name": "Wandern geführt"
          },
          {
            "id": "topic_sub_outdoor_natur_002",
            "name": "Schneeschuhwandern"
          },
          {
            "id": "topic_sub_outdoor_natur_003",
            "name": "Bergsteigen"
          },
          {
            "id": "topic_sub_outdoor_natur_004",
            "name": "Wildnis Camp"
          },
          {
            "id": "topic_sub_outdoor_natur_005",
            "name": "Nationalpark Tour"
          },
          {
            "id": "topic_sub_outdoor_natur_006",
            "name": "Kräuterwanderung"
          }
        ]
      },
      {
        "id": "sub_kochen_grillen",
        "name": "Kochen & Grillen",
        "topics": [
          {
            "id": "topic_sub_kochen_grillen_001",
            "name": "Kochkurs italienisch"
          },
          {
            "id": "topic_sub_kochen_grillen_002",
            "name": "Kochkurs asiatisch"
          },
          {
            "id": "topic_sub_kochen_grillen_003",
            "name": "Sushi Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_004",
            "name": "Vegan Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_005",
            "name": "Thai Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_006",
            "name": "Pasta Workshop"
          },
          {
            "id": "topic_sub_kochen_grillen_007",
            "name": "Grillkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_008",
            "name": "BBQ Workshop"
          },
          {
            "id": "topic_sub_kochen_grillen_009",
            "name": "Steak Grillkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_010",
            "name": "Bierverkostung"
          }
        ]
      },
      {
        "id": "sub_wein_bier_tastings",
        "name": "Wein, Bier & Tastings",
        "topics": [
          {
            "id": "topic_sub_wein_bier_tastings_001",
            "name": "Weinverkostung"
          },
          {
            "id": "topic_sub_wein_bier_tastings_002",
            "name": "Whisky Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_003",
            "name": "Gin Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_004",
            "name": "Rum Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_005",
            "name": "Kaffee Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_006",
            "name": "Cocktail Workshop"
          }
        ]
      },
      {
        "id": "sub_essen_besondere_dinner",
        "name": "Essen & besondere Dinner",
        "topics": [
          {
            "id": "topic_sub_essen_besondere_dinner_001",
            "name": "Barista Kurs"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_002",
            "name": "Dinner in the Dark"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_003",
            "name": "Luxus Dinner"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_004",
            "name": "Gourmet Erlebnis"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_005",
            "name": "Private Chef Erlebnis"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_006",
            "name": "Candle Light Dinner"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_007",
            "name": "Dinner Event"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_008",
            "name": "Degustationsmenü"
          }
        ]
      },
      {
        "id": "sub_wellness_entspannung",
        "name": "Wellness & Entspannung",
        "topics": [
          {
            "id": "topic_sub_wellness_entspannung_001",
            "name": "Spa Tagespass"
          },
          {
            "id": "topic_sub_wellness_entspannung_002",
            "name": "Massage Erlebnis"
          },
          {
            "id": "topic_sub_wellness_entspannung_003",
            "name": "Sauna Erlebnis"
          },
          {
            "id": "topic_sub_wellness_entspannung_004",
            "name": "Thermenbesuch"
          },
          {
            "id": "topic_sub_wellness_entspannung_005",
            "name": "Yoga Retreat"
          },
          {
            "id": "topic_sub_wellness_entspannung_006",
            "name": "Meditation Workshop"
          },
          {
            "id": "topic_sub_wellness_entspannung_007",
            "name": "Achtsamkeitskurs"
          }
        ]
      },
      {
        "id": "sub_auto_motorsport_fahren",
        "name": "Auto, Motorsport & Fahren",
        "topics": [
          {
            "id": "topic_sub_auto_motorsport_fahren_001",
            "name": "Sportwagen fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_002",
            "name": "Rennstrecke fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_003",
            "name": "Quad fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_004",
            "name": "Kart fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_005",
            "name": "Motorrad Training"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_006",
            "name": "Offroad fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_007",
            "name": "Drift Training"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_008",
            "name": "Jetski fahren"
          }
        ]
      },
      {
        "id": "sub_shows_spiele_unterhaltung",
        "name": "Shows, Spiele & Unterhaltung",
        "topics": [
          {
            "id": "topic_sub_shows_spiele_unterhaltung_001",
            "name": "Escape Room"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_002",
            "name": "Krimi Dinner"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_003",
            "name": "Comedy Show"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_004",
            "name": "Theater Workshop"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_005",
            "name": "Improvisation Kurs"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_006",
            "name": "Quiz Event"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_007",
            "name": "VR Erlebnis"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_gesundheit_fitness",
    "name": "Gesundheit & Fitness",
    "subcategories": [
      {
        "id": "sub_fitness_training",
        "name": "Fitness & Training",
        "topics": [
          {
            "id": "topic_sub_fitness_training_001",
            "name": "Personal Training"
          },
          {
            "id": "topic_sub_fitness_training_002",
            "name": "Fitnesskurs"
          },
          {
            "id": "topic_sub_fitness_training_003",
            "name": "Krafttraining"
          },
          {
            "id": "topic_sub_fitness_training_004",
            "name": "Ausdauertraining"
          },
          {
            "id": "topic_sub_fitness_training_005",
            "name": "Functional Training"
          },
          {
            "id": "topic_sub_fitness_training_006",
            "name": "HIIT Training"
          }
        ]
      },
      {
        "id": "sub_ernaehrung_abnehmen",
        "name": "Ernährung & Abnehmen",
        "topics": [
          {
            "id": "topic_sub_ernaehrung_abnehmen_001",
            "name": "Ernährungsberatung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_002",
            "name": "Abnehmen Coaching"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_003",
            "name": "Muskelaufbau Ernährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_004",
            "name": "Vegan Ernährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_005",
            "name": "Sporternährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_006",
            "name": "Diätberatung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_007",
            "name": "Gesunde Ernährung"
          }
        ]
      },
      {
        "id": "sub_yoga_meditation",
        "name": "Yoga & Meditation",
        "topics": [
          {
            "id": "topic_sub_yoga_meditation_001",
            "name": "Yoga Kurs"
          },
          {
            "id": "topic_sub_yoga_meditation_002",
            "name": "Meditation lernen"
          },
          {
            "id": "topic_sub_yoga_meditation_003",
            "name": "Achtsamkeitstraining"
          },
          {
            "id": "topic_sub_yoga_meditation_004",
            "name": "Atemübungen"
          },
          {
            "id": "topic_sub_yoga_meditation_005",
            "name": "Entspannungsübungen"
          },
          {
            "id": "topic_sub_yoga_meditation_006",
            "name": "Mindfulness Training"
          }
        ]
      },
      {
        "id": "sub_mental_health_wohlbefinden",
        "name": "Mental Health & Wohlbefinden",
        "topics": [
          {
            "id": "topic_sub_mental_health_wohlbefinden_001",
            "name": "Stressbewältigung"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_002",
            "name": "Burnout Prävention"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_003",
            "name": "Resilienz Training"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_004",
            "name": "Coaching mentale Stärke"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_005",
            "name": "Entspannungstechniken"
          }
        ]
      },
      {
        "id": "sub_gesundheit_praevention",
        "name": "Gesundheit & Prävention",
        "topics": [
          {
            "id": "topic_sub_gesundheit_praevention_001",
            "name": "Gesundheitscheck"
          },
          {
            "id": "topic_sub_gesundheit_praevention_002",
            "name": "Rückentraining"
          },
          {
            "id": "topic_sub_gesundheit_praevention_003",
            "name": "Haltung verbessern"
          },
          {
            "id": "topic_sub_gesundheit_praevention_004",
            "name": "Präventionskurse"
          },
          {
            "id": "topic_sub_gesundheit_praevention_005",
            "name": "Beweglichkeit verbessern"
          },
          {
            "id": "topic_sub_gesundheit_praevention_006",
            "name": "Herz-Kreislauf Training"
          },
          {
            "id": "topic_sub_gesundheit_praevention_007",
            "name": "Ergonomie Training"
          },
          {
            "id": "topic_sub_gesundheit_praevention_008",
            "name": "Gesundheitsberatung"
          }
        ]
      },
      {
        "id": "sub_therapie_regeneration",
        "name": "Therapie & Regeneration",
        "topics": [
          {
            "id": "topic_sub_therapie_regeneration_001",
            "name": "Physiotherapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_002",
            "name": "Massage Therapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_003",
            "name": "Osteopathie"
          },
          {
            "id": "topic_sub_therapie_regeneration_004",
            "name": "Rehabilitation Training"
          },
          {
            "id": "topic_sub_therapie_regeneration_005",
            "name": "Schmerztherapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_006",
            "name": "Faszien Training"
          },
          {
            "id": "topic_sub_therapie_regeneration_007",
            "name": "Regenerationstechniken"
          },
          {
            "id": "topic_sub_therapie_regeneration_008",
            "name": "Sportmassage"
          }
        ]
      },
      {
        "id": "sub_schlaf_regeneration",
        "name": "Schlaf & Regeneration",
        "topics": [
          {
            "id": "topic_sub_schlaf_regeneration_001",
            "name": "Schlafcoaching"
          },
          {
            "id": "topic_sub_schlaf_regeneration_002",
            "name": "Schlaf verbessern"
          },
          {
            "id": "topic_sub_schlaf_regeneration_003",
            "name": "Einschlaftraining"
          },
          {
            "id": "topic_sub_schlaf_regeneration_004",
            "name": "Abendroutinen"
          },
          {
            "id": "topic_sub_schlaf_regeneration_005",
            "name": "Stressfrei schlafen"
          },
          {
            "id": "topic_sub_schlaf_regeneration_006",
            "name": "Schlafanalyse"
          },
          {
            "id": "topic_sub_schlaf_regeneration_007",
            "name": "Regeneration im Alltag"
          },
          {
            "id": "topic_sub_schlaf_regeneration_008",
            "name": "Entspannungsrituale"
          }
        ]
      },
      {
        "id": "sub_koerper_balance",
        "name": "Körper & Balance",
        "topics": [
          {
            "id": "topic_sub_koerper_balance_001",
            "name": "Pilates Kurs"
          },
          {
            "id": "topic_sub_koerper_balance_002",
            "name": "Rückenschule"
          },
          {
            "id": "topic_sub_koerper_balance_003",
            "name": "Gleichgewichtstraining"
          },
          {
            "id": "topic_sub_koerper_balance_004",
            "name": "Beweglichkeitstraining"
          },
          {
            "id": "topic_sub_koerper_balance_005",
            "name": "Körperhaltung verbessern"
          },
          {
            "id": "topic_sub_koerper_balance_006",
            "name": "Core Training"
          },
          {
            "id": "topic_sub_koerper_balance_007",
            "name": "Stretching Kurs"
          },
          {
            "id": "topic_sub_koerper_balance_008",
            "name": "Balance Training"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_kreativitaet_hobbys",
    "name": "Kreativität & Hobbys",
    "subcategories": [
      {
        "id": "sub_malen_zeichnen_kunst",
        "name": "Malen, Zeichnen & Kunst",
        "topics": [
          {
            "id": "topic_sub_malen_zeichnen_kunst_001",
            "name": "Malen lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_002",
            "name": "Zeichnen lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_003",
            "name": "Aquarell malen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_004",
            "name": "Acrylmalerei"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_005",
            "name": "Ölmalerei"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_006",
            "name": "Skizzieren lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_007",
            "name": "Porträt zeichnen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_008",
            "name": "Kunst für Anfänger"
          }
        ]
      },
      {
        "id": "sub_musik_instrumente",
        "name": "Musik & Instrumente",
        "topics": [
          {
            "id": "topic_sub_musik_instrumente_001",
            "name": "Gitarre lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_002",
            "name": "Klavier lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_003",
            "name": "Gesangsunterricht"
          },
          {
            "id": "topic_sub_musik_instrumente_004",
            "name": "Schlagzeug lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_005",
            "name": "DJ Kurs"
          },
          {
            "id": "topic_sub_musik_instrumente_006",
            "name": "Musikproduktion"
          },
          {
            "id": "topic_sub_musik_instrumente_007",
            "name": "Songwriting"
          },
          {
            "id": "topic_sub_musik_instrumente_008",
            "name": "Tontechnik"
          }
        ]
      },
      {
        "id": "sub_fotografie_bildbearbeitung",
        "name": "Fotografie & Bildbearbeitung",
        "topics": [
          {
            "id": "topic_sub_fotografie_bildbearbeitung_001",
            "name": "Porträtfotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_002",
            "name": "Landschaftsfotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_003",
            "name": "Smartphone Fotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_004",
            "name": "Bildbearbeitung (Photoshop...)"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_005",
            "name": "Lightroom Kurs"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_006",
            "name": "Studiofotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_007",
            "name": "Kreative Fotografie"
          }
        ]
      },
      {
        "id": "sub_video_content_creation",
        "name": "Video & Content Creation",
        "topics": [
          {
            "id": "topic_sub_video_content_creation_001",
            "name": "YouTube Videos erstellen"
          },
          {
            "id": "topic_sub_video_content_creation_002",
            "name": "Social Media Content"
          },
          {
            "id": "topic_sub_video_content_creation_003",
            "name": "Storytelling Video"
          },
          {
            "id": "topic_sub_video_content_creation_004",
            "name": "Kamera Grundlagen"
          },
          {
            "id": "topic_sub_video_content_creation_005",
            "name": "Kurzfilm erstellen"
          },
          {
            "id": "topic_sub_video_content_creation_006",
            "name": "Reel & TikTok Produktion"
          },
          {
            "id": "topic_sub_video_content_creation_007",
            "name": "Videoproduktion"
          }
        ]
      },
      {
        "id": "sub_handarbeit_diy",
        "name": "Handarbeit & DIY",
        "topics": [
          {
            "id": "topic_sub_handarbeit_diy_001",
            "name": "Nähen lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_002",
            "name": "Stricken lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_003",
            "name": "Häkeln lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_004",
            "name": "Upcycling Workshop"
          },
          {
            "id": "topic_sub_handarbeit_diy_005",
            "name": "Makramee Kurs"
          },
          {
            "id": "topic_sub_handarbeit_diy_006",
            "name": "Basteln"
          },
          {
            "id": "topic_sub_handarbeit_diy_007",
            "name": "Schmuck selber machen"
          }
        ]
      },
      {
        "id": "sub_toepfern_kreatives_gestalten",
        "name": "Töpfern & kreatives Gestalten",
        "topics": [
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_001",
            "name": "Töpfern lernen"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_002",
            "name": "Keramik Workshop"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_003",
            "name": "Modellieren"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_004",
            "name": "Skulpturen gestalten"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_005",
            "name": "Arbeiten mit Ton"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_006",
            "name": "Glas gestalten"
          }
        ]
      },
      {
        "id": "sub_schreiben_kreative_texte",
        "name": "Schreiben & kreative Texte",
        "topics": [
          {
            "id": "topic_sub_schreiben_kreative_texte_001",
            "name": "Kreatives Schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_002",
            "name": "Storytelling lernen"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_003",
            "name": "Blog schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_004",
            "name": "Copywriting"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_005",
            "name": "Gedichte schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_006",
            "name": "Buch schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_007",
            "name": "Journaling"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_008",
            "name": "Schreibwerkstatt"
          }
        ]
      },
      {
        "id": "sub_schauspiel_performance",
        "name": "Schauspiel & Performance",
        "topics": [
          {
            "id": "topic_sub_schauspiel_performance_001",
            "name": "Schauspielkurs"
          },
          {
            "id": "topic_sub_schauspiel_performance_002",
            "name": "Improvisationstheater"
          },
          {
            "id": "topic_sub_schauspiel_performance_003",
            "name": "Bühnenperformance"
          },
          {
            "id": "topic_sub_schauspiel_performance_004",
            "name": "Körpersprache Training"
          },
          {
            "id": "topic_sub_schauspiel_performance_005",
            "name": "Präsentation mit Wirkung"
          },
          {
            "id": "topic_sub_schauspiel_performance_006",
            "name": "Sprechen vor Publikum"
          },
          {
            "id": "topic_sub_schauspiel_performance_007",
            "name": "Ausdruck & Stimme"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_karriere_business",
    "name": "Karriere & Business",
    "subcategories": [
      {
        "id": "sub_finanzen_controlling_recht",
        "name": "Finanzen, Controlling & Recht",
        "topics": [
          {
            "id": "topic_sub_finanzen_controlling_recht_001",
            "name": "Buchhaltung lernen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_002",
            "name": "Controlling"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_003",
            "name": "Kostenrechnung"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_004",
            "name": "Steuern"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_005",
            "name": "Unternehmensfinanzen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_006",
            "name": "Wirtschaftsrecht"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_007",
            "name": "Compliance"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_008",
            "name": "Rechnungswesen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_009",
            "name": "Lohnverrechnung"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_010",
            "name": "Fußball"
          }
        ]
      },
      {
        "id": "sub_fuehrung_management",
        "name": "Führung & Management",
        "topics": [
          {
            "id": "topic_sub_fuehrung_management_001",
            "name": "Leadership Training"
          },
          {
            "id": "topic_sub_fuehrung_management_002",
            "name": "Mitarbeiter führen lernen"
          },
          {
            "id": "topic_sub_fuehrung_management_003",
            "name": "Teammanagement"
          },
          {
            "id": "topic_sub_fuehrung_management_004",
            "name": "Motivation im Team"
          },
          {
            "id": "topic_sub_fuehrung_management_005",
            "name": "Konfliktmanagement Führung"
          },
          {
            "id": "topic_sub_fuehrung_management_006",
            "name": "Mitarbeitergespräche führen"
          },
          {
            "id": "topic_sub_fuehrung_management_007",
            "name": "Change Management"
          }
        ]
      },
      {
        "id": "sub_selbststaendigkeit_gruenden",
        "name": "Selbstständigkeit & Gründen",
        "topics": [
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_001",
            "name": "Selbstständig machen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_002",
            "name": "Businessplan erstellen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_003",
            "name": "Firma gründen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_004",
            "name": "Online Business starten"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_005",
            "name": "Nebenberuflich selbstständig"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_006",
            "name": "Geschäftsmodell entwickeln"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_007",
            "name": "Startup Grundlagen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_008",
            "name": "Unternehmertum lernen"
          }
        ]
      },
      {
        "id": "sub_investieren_vermoegensaufbau",
        "name": "Investieren & Vermögensaufbau",
        "topics": [
          {
            "id": "topic_sub_investieren_vermoegensaufbau_001",
            "name": "Investieren lernen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_002",
            "name": "Aktien Grundlagen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_003",
            "name": "Immobilien investieren"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_004",
            "name": "Vermögensaufbau"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_005",
            "name": "Trading"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_006",
            "name": "Kryptowährungen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_007",
            "name": "ETFs verstehen"
          }
        ]
      },
      {
        "id": "sub_marketing_vertrieb",
        "name": "Marketing & Vertrieb",
        "topics": [
          {
            "id": "topic_sub_marketing_vertrieb_001",
            "name": "Verkaufstraining"
          },
          {
            "id": "topic_sub_marketing_vertrieb_002",
            "name": "Sales Strategien"
          },
          {
            "id": "topic_sub_marketing_vertrieb_003",
            "name": "Kunden gewinnen"
          },
          {
            "id": "topic_sub_marketing_vertrieb_004",
            "name": "Online Marketing"
          }
        ]
      },
      {
        "id": "sub_kommunikation_verhandeln",
        "name": "Kommunikation & Verhandeln",
        "topics": [
          {
            "id": "topic_sub_kommunikation_verhandeln_001",
            "name": "Präsentationstraining"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_002",
            "name": "Gesprächsführung"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_003",
            "name": "Konflikte lösen"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_004",
            "name": "Überzeugend argumentieren"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_005",
            "name": "Pitch Training"
          }
        ]
      },
      {
        "id": "sub_produktivitaet_organisation",
        "name": "Produktivität & Organisation",
        "topics": [
          {
            "id": "topic_sub_produktivitaet_organisation_001",
            "name": "Selbstorganisation"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_002",
            "name": "Effizienz steigern"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_003",
            "name": "Prioritäten setzen"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_004",
            "name": "Arbeitsmethoden"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_005",
            "name": "Planung & Struktur"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_006",
            "name": "Ziele erreichen"
          }
        ]
      },
      {
        "id": "sub_bewerbung_karriereplanung",
        "name": "Bewerbung & Karriereplanung",
        "topics": [
          {
            "id": "topic_sub_bewerbung_karriereplanung_001",
            "name": "Bewerbung schreiben"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_002",
            "name": "Lebenslauf erstellen"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_003",
            "name": "Vorstellungsgespräch Training"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_004",
            "name": "Karriereplanung"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_005",
            "name": "Jobwechsel vorbereiten"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_006",
            "name": "Gehalt verhandeln"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_007",
            "name": "Berufliche Neuorientierung"
          }
        ]
      },
      {
        "id": "sub_digitale_business_skills",
        "name": "Digitale Business Skills",
        "topics": [
          {
            "id": "topic_sub_digitale_business_skills_001",
            "name": "PowerPoint"
          },
          {
            "id": "topic_sub_digitale_business_skills_002",
            "name": "Projektmanagement Tools"
          },
          {
            "id": "topic_sub_digitale_business_skills_003",
            "name": "CRM Systeme"
          },
          {
            "id": "topic_sub_digitale_business_skills_004",
            "name": "Datenanalyse"
          },
          {
            "id": "topic_sub_digitale_business_skills_005",
            "name": "Automatisierung"
          },
          {
            "id": "topic_sub_digitale_business_skills_006",
            "name": "KI im Business"
          },
          {
            "id": "topic_sub_digitale_business_skills_007",
            "name": "Digitale Tools"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_sport_bewegung",
    "name": "Sport & Bewegung",
    "subcategories": [
      {
        "id": "sub_ballsport_teamsport",
        "name": "Ballsport & Teamsport",
        "topics": [
          {
            "id": "topic_sub_ballsport_teamsport_001",
            "name": "Basketball"
          },
          {
            "id": "topic_sub_ballsport_teamsport_002",
            "name": "Volleyball"
          },
          {
            "id": "topic_sub_ballsport_teamsport_003",
            "name": "Tennis"
          },
          {
            "id": "topic_sub_ballsport_teamsport_004",
            "name": "Badminton"
          },
          {
            "id": "topic_sub_ballsport_teamsport_005",
            "name": "Tischtennis"
          },
          {
            "id": "topic_sub_ballsport_teamsport_006",
            "name": "Padel"
          }
        ]
      },
      {
        "id": "sub_wassersport",
        "name": "Wassersport",
        "topics": [
          {
            "id": "topic_sub_wassersport_001",
            "name": "Surfen"
          },
          {
            "id": "topic_sub_wassersport_002",
            "name": "Stand Up Paddling (SUP)"
          },
          {
            "id": "topic_sub_wassersport_003",
            "name": "Segeln"
          },
          {
            "id": "topic_sub_wassersport_004",
            "name": "Tauchen"
          },
          {
            "id": "topic_sub_wassersport_005",
            "name": "Kajak / Kanufahren"
          },
          {
            "id": "topic_sub_wassersport_006",
            "name": "Windsurfen"
          }
        ]
      },
      {
        "id": "sub_wintersport",
        "name": "Wintersport",
        "topics": [
          {
            "id": "topic_sub_wintersport_001",
            "name": "Skifahren"
          },
          {
            "id": "topic_sub_wintersport_002",
            "name": "Snowboarden"
          },
          {
            "id": "topic_sub_wintersport_003",
            "name": "Langlaufen"
          },
          {
            "id": "topic_sub_wintersport_004",
            "name": "Eislaufen"
          },
          {
            "id": "topic_sub_wintersport_005",
            "name": "Skitouren"
          }
        ]
      },
      {
        "id": "sub_outdoor_bergsport",
        "name": "Outdoor & Bergsport",
        "topics": [
          {
            "id": "topic_sub_outdoor_bergsport_001",
            "name": "Klettern / Bouldern"
          },
          {
            "id": "topic_sub_outdoor_bergsport_002",
            "name": "Mountainbiken"
          },
          {
            "id": "topic_sub_outdoor_bergsport_003",
            "name": "Trailrunning"
          },
          {
            "id": "topic_sub_outdoor_bergsport_004",
            "name": "Paragliding"
          }
        ]
      },
      {
        "id": "sub_kampfsport_selbstverteidigung",
        "name": "Kampfsport & Selbstverteidigung",
        "topics": [
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_001",
            "name": "Boxen"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_002",
            "name": "Kickboxen"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_003",
            "name": "Judo"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_004",
            "name": "Karate"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_005",
            "name": "MMA"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_006",
            "name": "Selbstverteidigung"
          }
        ]
      },
      {
        "id": "sub_trendsport_fun_sport",
        "name": "Trendsport & Fun-Sport",
        "topics": [
          {
            "id": "topic_sub_trendsport_fun_sport_001",
            "name": "Parkour"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_002",
            "name": "Slackline"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_003",
            "name": "Skateboard"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_004",
            "name": "Longboard"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_005",
            "name": "Trampolin"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_006",
            "name": "Ninja Warrior Training"
          }
        ]
      },
      {
        "id": "sub_tanz_bewegungskurse",
        "name": "Tanz & Bewegungskurse",
        "topics": [
          {
            "id": "topic_sub_tanz_bewegungskurse_001",
            "name": "Salsa"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_002",
            "name": "Bachata"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_003",
            "name": "Hip-Hop"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_004",
            "name": "Standardtanz"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_005",
            "name": "Breakdance"
          }
        ]
      }
    ]
  }
]'::jsonb,
    true
  ),
  updated_at = now()
where id = 'main';
