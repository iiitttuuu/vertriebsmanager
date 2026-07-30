-- Patch: Kategorien/Themenbereiche/Themen aus Neue Kat.csv einspielen.
-- Stand: 2026-06-20
-- Zweck:
--   - ersetzt payload.categories durch die neue CSV-Hierarchie
--   - erhaelt Anbieter-Zuordnungen ueber stabile Topic-IDs
--   - remappt bekannte alte Topic-IDs, falls eine ID wegen Namens-/Strukturwechsel geaendert wurde
--   - markiert Anbieter mit nicht eindeutig migrierbaren alten Topic-IDs per Anbieter-Notiz

insert into public.app_state (id, payload, updated_at)
values (
  'main',
  '{"sessionUserId":"","users":[],"providers":[],"categories":[]}'::jsonb,
  now()
)
on conflict (id) do nothing;

create temp table if not exists vm_new_categories_20260620 (payload jsonb);
truncate table vm_new_categories_20260620;
insert into vm_new_categories_20260620 (payload)
values ($json$
[
  {
    "id": "cat_erlebnisse_aktivitaeten",
    "name": "Erlebnisse & Freizeit",
    "subcategories": [
      {
        "id": "sub_abenteuer_und_adrenalin",
        "name": "Abenteuer & Adrenalin",
        "topics": [
          {
            "id": "topic_sub_abenteuer_008",
            "name": "Base Jump"
          },
          {
            "id": "topic_sub_abenteuer_002",
            "name": "Bungee Jumping"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_006",
            "name": "Erlebnispark"
          },
          {
            "id": "topic_sub_abenteuer_001",
            "name": "Fallschirmsprung"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_002",
            "name": "Freizeitpark Besuch"
          },
          {
            "id": "topic_sub_abenteuer_und_adrenalin_006",
            "name": "Hochseilgarten"
          },
          {
            "id": "topic_sub_abenteuer_007",
            "name": "Höhlentour"
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
            "id": "topic_sub_abenteuer_und_adrenalin_010",
            "name": "Waldseilpark"
          }
        ]
      },
      {
        "id": "sub_auto_motorsport_fahren",
        "name": "Auto, Motorsport & Fahren",
        "topics": [
          {
            "id": "topic_sub_auto_motorsport_fahren_007",
            "name": "Drift Training"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_002_02",
            "name": "Fahrschule & Fahrtraining"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_003_02",
            "name": "Fahrschule & Führerschein"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_004_02",
            "name": "Fahrsicherheitstraining"
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
            "id": "topic_sub_auto_motorsport_fahren_003",
            "name": "Quad fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_002",
            "name": "Rennstrecke fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_001",
            "name": "Sportwagen fahren"
          }
        ]
      },
      {
        "id": "sub_essen_besondere_dinner",
        "name": "Essen & besondere Dinner",
        "topics": [
          {
            "id": "topic_sub_essen_besondere_dinner_006",
            "name": "Candle Light Dinner"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_008",
            "name": "Degustationsmenü"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_007",
            "name": "Dinner Event"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_002",
            "name": "Dinner in the Dark"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_004",
            "name": "Gourmet Erlebnis"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_003",
            "name": "Luxus Dinner"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_005",
            "name": "Private Chef Erlebnis"
          }
        ]
      },
      {
        "id": "sub_kochen_grillen",
        "name": "Kochen & Grillen",
        "topics": [
          {
            "id": "topic_sub_kochen_grillen_008",
            "name": "BBQ Workshop"
          },
          {
            "id": "topic_sub_kochen_grillen_007",
            "name": "Grillkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_003_02",
            "name": "Grillschule"
          },
          {
            "id": "topic_sub_kochen_grillen_004_02",
            "name": "Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_002",
            "name": "Kochkurs asiatisch"
          },
          {
            "id": "topic_sub_kochen_grillen_001",
            "name": "Kochkurs italienisch"
          },
          {
            "id": "topic_sub_kochen_grillen_006",
            "name": "Pasta Workshop"
          },
          {
            "id": "topic_sub_kochen_grillen_009",
            "name": "Steak Grillkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_003",
            "name": "Sushi Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_005",
            "name": "Thai Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_004",
            "name": "Vegan Kochkurs"
          }
        ]
      },
      {
        "id": "sub_outdoor_natur",
        "name": "Outdoor & Natur",
        "topics": [
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_004",
            "name": "Bauernhof Erlebnis"
          },
          {
            "id": "topic_sub_outdoor_natur_003",
            "name": "Bergsteigen"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_005",
            "name": "Familienausflug Natur"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_008",
            "name": "Ferienprogramme"
          },
          {
            "id": "topic_sub_outdoor_natur_006",
            "name": "Kräuterwanderung"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_003",
            "name": "Kurzurlaub Familie"
          },
          {
            "id": "topic_sub_outdoor_natur_005",
            "name": "Nationalpark Tour"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_001",
            "name": "Outdoor Abenteuer Familie"
          },
          {
            "id": "topic_sub_outdoor_natur_002",
            "name": "Schneeschuhwandern"
          },
          {
            "id": "topic_sub_outdoor_natur_001",
            "name": "Wandern geführt"
          },
          {
            "id": "topic_sub_outdoor_natur_004",
            "name": "Wildnis Camp"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_003",
            "name": "Zoo Erlebnis"
          }
        ]
      },
      {
        "id": "sub_shows_spiele_unterhaltung",
        "name": "Shows, Spiele & Unterhaltung",
        "topics": [
          {
            "id": "topic_sub_shows_spiele_unterhaltung_001_02",
            "name": "Bowling"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_003",
            "name": "Comedy Show"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_001",
            "name": "Escape Room"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_005",
            "name": "Improvisation Kurs"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_001",
            "name": "Indoor Spielplatz"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_007",
            "name": "Kindergeburtstag Aktivitäten"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_002",
            "name": "Krimi Dinner"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_008",
            "name": "Minigolf"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_006",
            "name": "Quiz Event"
          },
          {
            "id": "topic_sub_baby_kleinkind_004",
            "name": "Spielgruppen"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_004",
            "name": "Theater Workshop"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_007",
            "name": "VR Erlebnis"
          }
        ]
      },
      {
        "id": "sub_wassererlebnisse",
        "name": "Wassererlebnisse",
        "topics": [
          {
            "id": "topic_sub_abenteuer_003",
            "name": "Canyoning"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_008",
            "name": "Jetski fahren"
          },
          {
            "id": "topic_sub_abenteuer_004",
            "name": "Rafting"
          }
        ]
      },
      {
        "id": "sub_wein_bier_tastings",
        "name": "Wein, Bier & Tastings",
        "topics": [
          {
            "id": "topic_sub_essen_besondere_dinner_001",
            "name": "Barista Kurs"
          },
          {
            "id": "topic_sub_wein_bier_tastings_002_02",
            "name": "Biererlebnis"
          },
          {
            "id": "topic_sub_kochen_grillen_010",
            "name": "Bierverkostung"
          },
          {
            "id": "topic_sub_wein_bier_tastings_006",
            "name": "Cocktail Workshop"
          },
          {
            "id": "topic_sub_wein_bier_tastings_005_02",
            "name": "Destillerie & Edelbrand"
          },
          {
            "id": "topic_sub_wein_bier_tastings_003",
            "name": "Gin Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_005",
            "name": "Kaffee Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_004",
            "name": "Rum Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_001",
            "name": "Weinverkostung"
          },
          {
            "id": "topic_sub_wein_bier_tastings_002",
            "name": "Whisky Tasting"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_gesundheit_fitness",
    "name": "Gesundheit & Wohlbefinden",
    "subcategories": [
      {
        "id": "sub_ernaehrung_abnehmen",
        "name": "Ernährung & Abnehmen",
        "topics": [
          {
            "id": "topic_sub_ernaehrung_abnehmen_002",
            "name": "Abnehmen Coaching"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_006",
            "name": "Diätberatung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_001",
            "name": "Ernährungsberatung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_007",
            "name": "Gesunde Ernährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_003",
            "name": "Muskelaufbau Ernährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_005",
            "name": "Sporternährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_004",
            "name": "Vegan Ernährung"
          }
        ]
      },
      {
        "id": "sub_fitness_training",
        "name": "Fitness & Training",
        "topics": [
          {
            "id": "topic_sub_fitness_training_004",
            "name": "Ausdauertraining"
          },
          {
            "id": "topic_sub_fitness_training_002_02",
            "name": "Body Shaping"
          },
          {
            "id": "topic_sub_fitness_training_002",
            "name": "Fitnesskurs"
          },
          {
            "id": "topic_sub_fitness_training_005",
            "name": "Functional Training"
          },
          {
            "id": "topic_sub_fitness_training_006",
            "name": "HIIT Training"
          },
          {
            "id": "topic_sub_fitness_training_003",
            "name": "Krafttraining"
          },
          {
            "id": "topic_sub_fitness_training_001",
            "name": "Personal Training"
          }
        ]
      },
      {
        "id": "sub_gesundheit_praevention",
        "name": "Gesundheit & Prävention",
        "topics": [
          {
            "id": "topic_sub_gesundheit_praevention_005",
            "name": "Beweglichkeit verbessern"
          },
          {
            "id": "topic_sub_gesundheit_praevention_007",
            "name": "Ergonomie Training"
          },
          {
            "id": "topic_sub_baby_kleinkind_007",
            "name": "Erste Hilfe am Kind"
          },
          {
            "id": "topic_sub_gesundheit_praevention_008",
            "name": "Gesundheitsberatung"
          },
          {
            "id": "topic_sub_gesundheit_praevention_001",
            "name": "Gesundheitscheck"
          },
          {
            "id": "topic_sub_gesundheit_praevention_003",
            "name": "Haltung verbessern"
          },
          {
            "id": "topic_sub_gesundheit_praevention_006",
            "name": "Herz-Kreislauf Training"
          },
          {
            "id": "topic_sub_gesundheit_praevention_004",
            "name": "Präventionskurse"
          },
          {
            "id": "topic_sub_gesundheit_praevention_002",
            "name": "Rückentraining"
          }
        ]
      },
      {
        "id": "sub_koerper_balance",
        "name": "Körper & Balance",
        "topics": [
          {
            "id": "topic_sub_koerper_balance_008",
            "name": "Balance Training"
          },
          {
            "id": "topic_sub_koerper_balance_004",
            "name": "Beweglichkeitstraining"
          },
          {
            "id": "topic_sub_koerper_balance_006",
            "name": "Core Training"
          },
          {
            "id": "topic_sub_koerper_balance_003",
            "name": "Gleichgewichtstraining"
          },
          {
            "id": "topic_sub_koerper_balance_005",
            "name": "Körperhaltung verbessern"
          },
          {
            "id": "topic_sub_koerper_balance_001",
            "name": "Pilates Kurs"
          },
          {
            "id": "topic_sub_koerper_balance_002",
            "name": "Rückenschule"
          },
          {
            "id": "topic_sub_koerper_balance_007",
            "name": "Stretching Kurs"
          }
        ]
      },
      {
        "id": "sub_mental_health_wohlbefinden",
        "name": "Mental Health & Wohlbefinden",
        "topics": [
          {
            "id": "topic_sub_mental_health_wohlbefinden_002",
            "name": "Burnout Prävention"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_004",
            "name": "Coaching mentale Stärke"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_005",
            "name": "Entspannungstechniken"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_003",
            "name": "Resilienz Training"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_001",
            "name": "Stressbewältigung"
          },
          {
            "id": "topic_sub_elternkurse_coaching_006",
            "name": "Stressmanagement Eltern"
          }
        ]
      },
      {
        "id": "sub_schlaf_regeneration",
        "name": "Schlaf & Regeneration",
        "topics": [
          {
            "id": "topic_sub_schlaf_regeneration_004",
            "name": "Abendroutinen"
          },
          {
            "id": "topic_sub_schlaf_regeneration_003",
            "name": "Einschlaftraining"
          },
          {
            "id": "topic_sub_schlaf_regeneration_008",
            "name": "Entspannungsrituale"
          },
          {
            "id": "topic_sub_schlaf_regeneration_007",
            "name": "Regeneration im Alltag"
          },
          {
            "id": "topic_sub_schlaf_regeneration_002",
            "name": "Schlaf verbessern"
          },
          {
            "id": "topic_sub_schlaf_regeneration_006",
            "name": "Schlafanalyse"
          },
          {
            "id": "topic_sub_baby_kleinkind_008",
            "name": "Schlafberatung Baby"
          },
          {
            "id": "topic_sub_schlaf_regeneration_001",
            "name": "Schlafcoaching"
          },
          {
            "id": "topic_sub_schlaf_regeneration_005",
            "name": "Stressfrei schlafen"
          }
        ]
      },
      {
        "id": "sub_therapie_regeneration",
        "name": "Therapie & Regeneration",
        "topics": [
          {
            "id": "topic_sub_baby_kleinkind_001",
            "name": "Baby Massage"
          },
          {
            "id": "topic_sub_therapie_regeneration_006",
            "name": "Faszien Training"
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
            "id": "topic_sub_therapie_regeneration_001",
            "name": "Physiotherapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_007",
            "name": "Regenerationstechniken"
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
            "id": "topic_sub_therapie_regeneration_008",
            "name": "Sportmassage"
          }
        ]
      },
      {
        "id": "sub_wellness_entspannung",
        "name": "Wellness & Entspannung",
        "topics": [
          {
            "id": "topic_sub_wellness_entspannung_007",
            "name": "Achtsamkeitskurs"
          },
          {
            "id": "topic_sub_wellness_entspannung_002",
            "name": "Massage Erlebnis"
          },
          {
            "id": "topic_sub_wellness_entspannung_006",
            "name": "Meditation Workshop"
          },
          {
            "id": "topic_sub_wellness_entspannung_003",
            "name": "Sauna Erlebnis"
          },
          {
            "id": "topic_sub_wellness_entspannung_001",
            "name": "Spa Tagespass"
          },
          {
            "id": "topic_sub_wellness_entspannung_004",
            "name": "Thermenbesuch"
          },
          {
            "id": "topic_sub_wellness_entspannung_005",
            "name": "Yoga Retreat"
          }
        ]
      },
      {
        "id": "sub_yoga_meditation",
        "name": "Yoga & Meditation",
        "topics": [
          {
            "id": "topic_sub_elternkurse_coaching_008",
            "name": "Achtsamkeit für Eltern"
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
            "id": "topic_sub_yoga_meditation_002",
            "name": "Meditation lernen"
          },
          {
            "id": "topic_sub_yoga_meditation_006",
            "name": "Mindfulness Training"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_003",
            "name": "Yoga für Kinder"
          },
          {
            "id": "topic_sub_yoga_meditation_001",
            "name": "Yoga Kurs"
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
        "id": "sub_fotografie_bildbearbeitung",
        "name": "Fotografie & Bildbearbeitung",
        "topics": [
          {
            "id": "topic_sub_fotografie_bildbearbeitung_004",
            "name": "Bildbearbeitung (Photoshop...)"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_002",
            "name": "Familien Fotoshooting"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_007",
            "name": "Kreative Fotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_002",
            "name": "Landschaftsfotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_005",
            "name": "Lightroom Kurs"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_001",
            "name": "Porträtfotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_003",
            "name": "Smartphone Fotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_006",
            "name": "Studiofotografie"
          }
        ]
      },
      {
        "id": "sub_handarbeit_diy",
        "name": "Handarbeit & DIY",
        "topics": [
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_001",
            "name": "Bastelkurs Kinder"
          },
          {
            "id": "topic_sub_handarbeit_diy_006",
            "name": "Basteln"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_004",
            "name": "DIY Projekte Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_006",
            "name": "Handwerken Kinder"
          },
          {
            "id": "topic_sub_handarbeit_diy_003",
            "name": "Häkeln lernen"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_008",
            "name": "Kreativ Workshop Familie"
          },
          {
            "id": "topic_sub_handarbeit_diy_005",
            "name": "Makramee Kurs"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_007",
            "name": "Nähen für Kinder"
          },
          {
            "id": "topic_sub_handarbeit_diy_001",
            "name": "Nähen lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_007",
            "name": "Schmuck selber machen"
          },
          {
            "id": "topic_sub_handarbeit_diy_002",
            "name": "Stricken lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_004",
            "name": "Upcycling Workshop"
          }
        ]
      },
      {
        "id": "sub_malen_zeichnen_kunst",
        "name": "Malen, Zeichnen & Kunst",
        "topics": [
          {
            "id": "topic_sub_malen_zeichnen_kunst_004",
            "name": "Acrylmalerei"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_003",
            "name": "Aquarell malen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_003_02",
            "name": "Graffiti Workshop"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_008",
            "name": "Kunst für Anfänger"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_002",
            "name": "Malen für Kinder"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_001",
            "name": "Malen lernen"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_004",
            "name": "Malkurs Kinder"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_007",
            "name": "Porträt zeichnen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_006",
            "name": "Skizzieren lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_002",
            "name": "Zeichnen lernen"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_005",
            "name": "Zeichnen lernen Kinder"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_005",
            "name": "Ölmalerei"
          }
        ]
      },
      {
        "id": "sub_musik_instrumente",
        "name": "Musik & Instrumente",
        "topics": [
          {
            "id": "topic_sub_musik_instrumente_005",
            "name": "DJ Kurs"
          },
          {
            "id": "topic_sub_musik_instrumente_003",
            "name": "Gesangsunterricht"
          },
          {
            "id": "topic_sub_musik_instrumente_001",
            "name": "Gitarre lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_002",
            "name": "Klavier lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_006",
            "name": "Musikproduktion"
          },
          {
            "id": "topic_sub_musik_instrumente_006_02",
            "name": "Musikunterricht"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_005",
            "name": "Musikunterricht Kinder"
          },
          {
            "id": "topic_sub_musik_instrumente_004",
            "name": "Schlagzeug lernen"
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
        "id": "sub_schauspiel_performance",
        "name": "Schauspiel & Performance",
        "topics": [
          {
            "id": "topic_sub_schauspiel_performance_007",
            "name": "Ausdruck & Stimme"
          },
          {
            "id": "topic_sub_schauspiel_performance_003",
            "name": "Bühnenperformance"
          },
          {
            "id": "topic_sub_schauspiel_performance_002",
            "name": "Improvisationstheater"
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
            "id": "topic_sub_schauspiel_performance_001",
            "name": "Schauspielkurs"
          },
          {
            "id": "topic_sub_schauspiel_performance_006",
            "name": "Sprechen vor Publikum"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_006",
            "name": "Theaterkurs Kinder"
          }
        ]
      },
      {
        "id": "sub_schreiben_kreative_texte",
        "name": "Schreiben & kreative Texte",
        "topics": [
          {
            "id": "topic_sub_schreiben_kreative_texte_003",
            "name": "Blog schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_006",
            "name": "Buch schreiben"
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
            "id": "topic_sub_schreiben_kreative_texte_007",
            "name": "Journaling"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_001",
            "name": "Kreatives Schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_008",
            "name": "Schreibwerkstatt"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_002",
            "name": "Storytelling lernen"
          }
        ]
      },
      {
        "id": "sub_toepfern_kreatives_gestalten",
        "name": "Töpfern & kreatives Gestalten",
        "topics": [
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_005",
            "name": "Arbeiten mit Ton"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_006",
            "name": "Glas gestalten"
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
            "id": "topic_sub_kreativitaet_basteln_kinder_003",
            "name": "Töpfern Kinder"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_001",
            "name": "Töpfern lernen"
          }
        ]
      },
      {
        "id": "sub_video_content_creation",
        "name": "Video & Content Creation",
        "topics": [
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
            "id": "topic_sub_video_content_creation_002",
            "name": "Social Media Content"
          },
          {
            "id": "topic_sub_video_content_creation_003",
            "name": "Storytelling Video"
          },
          {
            "id": "topic_sub_video_content_creation_007",
            "name": "Videoproduktion"
          },
          {
            "id": "topic_sub_video_content_creation_001",
            "name": "YouTube Videos erstellen"
          }
        ]
      },
      {
        "id": "sub_weitere_kreative_themen",
        "name": "Weitere kreative Themen",
        "topics": [
          {
            "id": "topic_sub_weitere_kreative_themen_001",
            "name": "Imkern"
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
        "id": "sub_bewerbung_karriereplanung",
        "name": "Bewerbung & Karriereplanung",
        "topics": [
          {
            "id": "topic_sub_bewerbung_karriereplanung_007",
            "name": "Berufliche Neuorientierung"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_001",
            "name": "Bewerbung schreiben"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_006",
            "name": "Gehalt verhandeln"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_005",
            "name": "Jobwechsel vorbereiten"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_004",
            "name": "Karriereplanung"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_002",
            "name": "Lebenslauf erstellen"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_003",
            "name": "Vorstellungsgespräch Training"
          }
        ]
      },
      {
        "id": "sub_digitale_business_skills",
        "name": "Digitale Business Skills",
        "topics": [
          {
            "id": "topic_sub_digitale_business_skills_005",
            "name": "Automatisierung"
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
            "id": "topic_sub_digitale_business_skills_007",
            "name": "Digitale Tools"
          },
          {
            "id": "topic_sub_digitale_business_skills_006",
            "name": "KI im Business"
          },
          {
            "id": "topic_sub_digitale_business_skills_006_02",
            "name": "KI Workshop"
          },
          {
            "id": "topic_sub_digitale_business_skills_001",
            "name": "PowerPoint"
          },
          {
            "id": "topic_sub_digitale_business_skills_002",
            "name": "Projektmanagement Tools"
          }
        ]
      },
      {
        "id": "sub_finanzen_controlling_recht",
        "name": "Finanzen, Controlling & Recht",
        "topics": [
          {
            "id": "topic_sub_finanzen_controlling_recht_001",
            "name": "Buchhaltung lernen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_007",
            "name": "Compliance"
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
            "id": "topic_sub_finanzen_controlling_recht_009",
            "name": "Lohnverrechnung"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_008",
            "name": "Rechnungswesen"
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
          }
        ]
      },
      {
        "id": "sub_fuehrung_management",
        "name": "Führung & Management",
        "topics": [
          {
            "id": "topic_sub_fuehrung_management_007",
            "name": "Change Management"
          },
          {
            "id": "topic_sub_fuehrung_management_005",
            "name": "Konfliktmanagement Führung"
          },
          {
            "id": "topic_sub_fuehrung_management_001",
            "name": "Leadership Training"
          },
          {
            "id": "topic_sub_fuehrung_management_002",
            "name": "Mitarbeiter führen lernen"
          },
          {
            "id": "topic_sub_fuehrung_management_006",
            "name": "Mitarbeitergespräche führen"
          },
          {
            "id": "topic_sub_fuehrung_management_004",
            "name": "Motivation im Team"
          },
          {
            "id": "topic_sub_fuehrung_management_003",
            "name": "Teammanagement"
          }
        ]
      },
      {
        "id": "sub_investieren_vermoegensaufbau",
        "name": "Investieren & Vermögensaufbau",
        "topics": [
          {
            "id": "topic_sub_investieren_vermoegensaufbau_002",
            "name": "Aktien Grundlagen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_007",
            "name": "ETFs verstehen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_003",
            "name": "Immobilien investieren"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_001",
            "name": "Investieren lernen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_006",
            "name": "Kryptowährungen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_005",
            "name": "Trading"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_004",
            "name": "Vermögensaufbau"
          }
        ]
      },
      {
        "id": "sub_kommunikation_verhandeln",
        "name": "Kommunikation & Verhandeln",
        "topics": [
          {
            "id": "topic_sub_kommunikation_verhandeln_002",
            "name": "Gesprächsführung"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_003",
            "name": "Konflikte lösen"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_005",
            "name": "Pitch Training"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_001",
            "name": "Präsentationstraining"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_004",
            "name": "Überzeugend argumentieren"
          }
        ]
      },
      {
        "id": "sub_marketing_vertrieb",
        "name": "Marketing & Vertrieb",
        "topics": [
          {
            "id": "topic_sub_marketing_vertrieb_003",
            "name": "Kunden gewinnen"
          },
          {
            "id": "topic_sub_marketing_vertrieb_004",
            "name": "Online Marketing"
          },
          {
            "id": "topic_sub_marketing_vertrieb_002",
            "name": "Sales Strategien"
          },
          {
            "id": "topic_sub_marketing_vertrieb_001",
            "name": "Verkaufstraining"
          }
        ]
      },
      {
        "id": "sub_produktivitaet_organisation",
        "name": "Produktivität & Organisation",
        "topics": [
          {
            "id": "topic_sub_produktivitaet_organisation_004",
            "name": "Arbeitsmethoden"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_002",
            "name": "Effizienz steigern"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_005",
            "name": "Planung & Struktur"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_003",
            "name": "Prioritäten setzen"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_001",
            "name": "Selbstorganisation"
          },
          {
            "id": "topic_sub_elternkurse_coaching_007",
            "name": "Vereinbarkeit Familie & Beruf"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_006",
            "name": "Ziele erreichen"
          }
        ]
      },
      {
        "id": "sub_selbststaendigkeit_gruenden",
        "name": "Selbstständigkeit & Gründen",
        "topics": [
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_002",
            "name": "Businessplan erstellen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_003",
            "name": "Firma gründen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_006",
            "name": "Geschäftsmodell entwickeln"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_005",
            "name": "Nebenberuflich selbstständig"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_004",
            "name": "Online Business starten"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_001",
            "name": "Selbstständig machen"
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
      }
    ]
  },
  {
    "id": "cat_lernen_weiterbildung",
    "name": "Lernen & Weiterbildung",
    "subcategories": [
      {
        "id": "sub_business_buero_skills",
        "name": "Business & Büro Skills",
        "topics": [
          {
            "id": "topic_sub_business_buero_skills_006",
            "name": "Business Analyse"
          },
          {
            "id": "topic_sub_business_buero_skills_001",
            "name": "Excel Kurs"
          },
          {
            "id": "topic_sub_business_buero_skills_007",
            "name": "MS Office Grundlagen"
          },
          {
            "id": "topic_sub_business_buero_skills_008",
            "name": "Organisation im Büro"
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
            "id": "topic_sub_business_buero_skills_005",
            "name": "Prozessmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_004",
            "name": "Zeitmanagement"
          }
        ]
      },
      {
        "id": "sub_design_foto_video",
        "name": "Design, Foto & Video",
        "topics": [
          {
            "id": "topic_sub_design_foto_video_002",
            "name": "Bildbearbeitung (Photoshop, Lightroom...)"
          },
          {
            "id": "topic_sub_design_foto_video_005",
            "name": "Content Creation"
          },
          {
            "id": "topic_sub_design_foto_video_001",
            "name": "Fotografie Grundlagen"
          },
          {
            "id": "topic_sub_design_foto_video_003",
            "name": "Grafikdesign"
          },
          {
            "id": "topic_sub_design_foto_video_007",
            "name": "Illustration"
          },
          {
            "id": "topic_sub_design_foto_video_008",
            "name": "Social Media Content erstellen"
          },
          {
            "id": "topic_sub_design_foto_video_006",
            "name": "UI/UX Design"
          },
          {
            "id": "topic_sub_design_foto_video_004",
            "name": "Videobearbeitung"
          }
        ]
      },
      {
        "id": "sub_kommunikation_persoenliche_skills",
        "name": "Kommunikation & persönliche Skills",
        "topics": [
          {
            "id": "topic_sub_elternkurse_coaching_001",
            "name": "Elterncoaching"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_007",
            "name": "Entscheidungsfindung"
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
            "id": "topic_sub_kommunikation_persoenliche_skills_001",
            "name": "Kommunikation verbessern"
          },
          {
            "id": "topic_sub_elternkurse_coaching_004",
            "name": "Konflikte lösen Familie"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_004",
            "name": "Konfliktmanagement"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_008",
            "name": "Kritikfähigkeit"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_006",
            "name": "Körpersprache verstehen"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_010",
            "name": "Präsentation & Rhetorik"
          },
          {
            "id": "topic_sub_elternkurse_coaching_005",
            "name": "Pubertät verstehen"
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
            "id": "topic_sub_kommunikation_persoenliche_skills_005",
            "name": "Verhandlungstechniken"
          }
        ]
      },
      {
        "id": "sub_marketing_online_business",
        "name": "Marketing & Online Business",
        "topics": [
          {
            "id": "topic_sub_marketing_online_business_004",
            "name": "Content Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_005",
            "name": "E-Mail Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_002",
            "name": "Google Ads (SEA)"
          },
          {
            "id": "topic_sub_marketing_online_business_007",
            "name": "Influencer Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_008",
            "name": "Online Business aufbauen"
          },
          {
            "id": "topic_sub_marketing_online_business_006",
            "name": "Performance Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_001",
            "name": "SEO lernen"
          },
          {
            "id": "topic_sub_marketing_online_business_003",
            "name": "Social Media Marketing"
          }
        ]
      },
      {
        "id": "sub_programmieren_it",
        "name": "Programmieren & IT",
        "topics": [
          {
            "id": "topic_sub_programmieren_it_004",
            "name": "App Entwicklung"
          },
          {
            "id": "topic_sub_programmieren_it_007",
            "name": "Cloud Computing"
          },
          {
            "id": "topic_sub_programmieren_it_005",
            "name": "Data Science Grundlagen"
          },
          {
            "id": "topic_sub_programmieren_it_008",
            "name": "IT Grundlagen"
          },
          {
            "id": "topic_sub_programmieren_it_003",
            "name": "JavaScript lernen"
          },
          {
            "id": "topic_sub_programmieren_it_006",
            "name": "Künstliche Intelligenz"
          },
          {
            "id": "topic_sub_programmieren_it_001",
            "name": "Python programmieren"
          },
          {
            "id": "topic_sub_programmieren_it_002",
            "name": "Webentwicklung (HTML, CSS)"
          }
        ]
      },
      {
        "id": "sub_schule_nachhilfe",
        "name": "Schule & Nachhilfe",
        "topics": [
          {
            "id": "topic_sub_schule_nachhilfe_005",
            "name": "Chemie Nachhilfe"
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
            "id": "topic_sub_baby_kleinkind_003",
            "name": "Frühförderung"
          },
          {
            "id": "topic_sub_schule_nachhilfe_007",
            "name": "Hausaufgabenhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_006",
            "name": "Lerntechniken"
          },
          {
            "id": "topic_sub_schule_nachhilfe_001",
            "name": "Mathe Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_004",
            "name": "Physik Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_008",
            "name": "Prüfungsvorbereitung Schule"
          }
        ]
      },
      {
        "id": "sub_sprachen_lernen",
        "name": "Sprachen lernen",
        "topics": [
          {
            "id": "topic_sub_sprachen_lernen_006",
            "name": "Business Englisch"
          },
          {
            "id": "topic_sub_sprachen_lernen_002",
            "name": "Deutsch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_001",
            "name": "Englisch lernen"
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
            "id": "topic_sub_sprachen_lernen_007",
            "name": "Konversationskurs"
          },
          {
            "id": "topic_sub_sprachen_lernen_003",
            "name": "Spanisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_008",
            "name": "Sprachzertifikat Vorbereitung"
          }
        ]
      },
      {
        "id": "sub_studium_akademische_skills",
        "name": "Studium & akademische Skills",
        "topics": [
          {
            "id": "topic_sub_studium_akademische_skills_002",
            "name": "Bachelorarbeit schreiben"
          },
          {
            "id": "topic_sub_studium_akademische_skills_003",
            "name": "Masterarbeit schreiben"
          },
          {
            "id": "topic_sub_studium_akademische_skills_005",
            "name": "Präsentationen halten"
          },
          {
            "id": "topic_sub_studium_akademische_skills_008",
            "name": "Prüfungsvorbereitung Uni"
          },
          {
            "id": "topic_sub_studium_akademische_skills_006",
            "name": "Recherche Methoden"
          },
          {
            "id": "topic_sub_studium_akademische_skills_004",
            "name": "Statistik Grundlagen"
          },
          {
            "id": "topic_sub_studium_akademische_skills_001",
            "name": "Wissenschaftliches Arbeiten"
          },
          {
            "id": "topic_sub_studium_akademische_skills_007",
            "name": "Zeitmanagement im Studium"
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
            "id": "topic_sub_ballsport_teamsport_004",
            "name": "Badminton"
          },
          {
            "id": "topic_sub_ballsport_teamsport_001",
            "name": "Basketball"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_010",
            "name": "Fußball"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_001",
            "name": "Fußballtraining Kinder"
          },
          {
            "id": "topic_sub_ballsport_teamsport_005_02",
            "name": "Golf"
          },
          {
            "id": "topic_sub_ballsport_teamsport_006",
            "name": "Padel"
          },
          {
            "id": "topic_sub_ballsport_teamsport_003",
            "name": "Tennis"
          },
          {
            "id": "topic_sub_ballsport_teamsport_005",
            "name": "Tischtennis"
          },
          {
            "id": "topic_sub_ballsport_teamsport_002",
            "name": "Volleyball"
          }
        ]
      },
      {
        "id": "sub_fitness_training_02",
        "name": "Fitness & Training",
        "topics": [
          {
            "id": "topic_sub_sport_bewegung_kinder_008",
            "name": "Bewegung & Motorik"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_007",
            "name": "Leichtathletik Kinder"
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
            "id": "topic_sub_kampfsport_selbstverteidigung_003",
            "name": "Judo"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_002",
            "name": "Kampfsport Kinder"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_004",
            "name": "Karate"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_002",
            "name": "Kickboxen"
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
        "id": "sub_luftsport_und_fliegen",
        "name": "Luftsport & Fliegen",
        "topics": [
          {
            "id": "topic_sub_luftsport_und_fliegen_001",
            "name": "Ballonfahren"
          },
          {
            "id": "topic_sub_luftsport_und_fliegen_002",
            "name": "Flugschule & Flugschein"
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
            "id": "topic_sub_sport_bewegung_kinder_004",
            "name": "Klettern Kinder"
          },
          {
            "id": "topic_sub_outdoor_bergsport_002",
            "name": "Mountainbiken"
          },
          {
            "id": "topic_sub_outdoor_bergsport_004",
            "name": "Paragliding"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_005",
            "name": "Reiten Kinder"
          },
          {
            "id": "topic_sub_outdoor_bergsport_006",
            "name": "Reitpädagogik"
          },
          {
            "id": "topic_sub_outdoor_bergsport_007",
            "name": "Reitunterricht"
          },
          {
            "id": "topic_sub_outdoor_bergsport_003",
            "name": "Trailrunning"
          }
        ]
      },
      {
        "id": "sub_tanz_bewegungskurse",
        "name": "Tanz & Bewegungskurse",
        "topics": [
          {
            "id": "topic_sub_tanz_bewegungskurse_002",
            "name": "Bachata"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_006",
            "name": "Ballett Kinder"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_005",
            "name": "Breakdance"
          },
          {
            "id": "topic_sub_baby_kleinkind_002",
            "name": "Eltern-Kind Turnen"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_005_02",
            "name": "exotische Tänze"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_003",
            "name": "Hip-Hop"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_002",
            "name": "Kinderturnen"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_001",
            "name": "Salsa"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_009",
            "name": "Salsa Workshop"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_004",
            "name": "Standardtanz"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_003",
            "name": "Tanzkurs Kinder"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_012",
            "name": "Tanzschule"
          }
        ]
      },
      {
        "id": "sub_trendsport_fun_sport",
        "name": "Trendsport & Fun-Sport",
        "topics": [
          {
            "id": "topic_sub_trendsport_fun_sport_004",
            "name": "Longboard"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_006",
            "name": "Ninja Warrior Training"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_001",
            "name": "Parkour"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_003",
            "name": "Skateboard"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_002",
            "name": "Slackline"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_005",
            "name": "Trampolin"
          }
        ]
      },
      {
        "id": "sub_wassersport",
        "name": "Wassersport",
        "topics": [
          {
            "id": "topic_sub_baby_kleinkind_005",
            "name": "Babyschwimmen"
          },
          {
            "id": "topic_sub_wassersport_005",
            "name": "Kajak / Kanufahren"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_001",
            "name": "Schwimmkurs Kinder"
          },
          {
            "id": "topic_sub_wassersport_003",
            "name": "Segeln"
          },
          {
            "id": "topic_sub_wassersport_002",
            "name": "Stand Up Paddling (SUP)"
          },
          {
            "id": "topic_sub_wassersport_001",
            "name": "Surfen"
          },
          {
            "id": "topic_sub_wassersport_004",
            "name": "Tauchen"
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
            "id": "topic_sub_wintersport_004",
            "name": "Eislaufen"
          },
          {
            "id": "topic_sub_wintersport_003",
            "name": "Langlaufen"
          },
          {
            "id": "topic_sub_wintersport_001",
            "name": "Skifahren"
          },
          {
            "id": "topic_sub_wintersport_005",
            "name": "Skitouren"
          },
          {
            "id": "topic_sub_wintersport_002",
            "name": "Snowboarden"
          }
        ]
      }
    ]
  }
]
$json$::jsonb);

create temp table if not exists vm_old_topic_lookup_20260620 (
  old_topic_id text primary key,
  old_topic_name text not null,
  old_subcategory_name text not null,
  old_category_name text not null
);
truncate table vm_old_topic_lookup_20260620;
insert into vm_old_topic_lookup_20260620 (old_topic_id, old_topic_name, old_subcategory_name, old_category_name)
values
  ('topic_sub_kinderkurse_aktivitaeten_001', 'Schwimmkurs Kinder', 'Kinderkurse & Aktivitäten', 'Familie & Kinder'),
  ('topic_sub_kinderkurse_aktivitaeten_002', 'Kinderturnen', 'Kinderkurse & Aktivitäten', 'Familie & Kinder'),
  ('topic_sub_kinderkurse_aktivitaeten_003', 'Tanzkurs Kinder', 'Kinderkurse & Aktivitäten', 'Familie & Kinder'),
  ('topic_sub_kinderkurse_aktivitaeten_004', 'Malkurs Kinder', 'Kinderkurse & Aktivitäten', 'Familie & Kinder'),
  ('topic_sub_kinderkurse_aktivitaeten_005', 'Musikunterricht Kinder', 'Kinderkurse & Aktivitäten', 'Familie & Kinder'),
  ('topic_sub_kinderkurse_aktivitaeten_006', 'Theaterkurs Kinder', 'Kinderkurse & Aktivitäten', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_001', 'Bastelkurs Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_002', 'Malen für Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_003', 'Töpfern Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_004', 'DIY Projekte Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_005', 'Zeichnen lernen Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_006', 'Handwerken Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_007', 'Nähen für Kinder', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_kreativitaet_basteln_kinder_008', 'Kreativ Workshop Familie', 'Kreativität & Basteln für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_001', 'Fußballtraining Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_002', 'Kampfsport Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_003', 'Yoga für Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_004', 'Klettern Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_005', 'Reiten Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_006', 'Ballett Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_007', 'Leichtathletik Kinder', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_sport_bewegung_kinder_008', 'Bewegung & Motorik', 'Sport & Bewegung für Kinder', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_001', 'Baby Massage', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_002', 'Eltern-Kind Turnen', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_003', 'Frühförderung', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_004', 'Spielgruppen', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_005', 'Babyschwimmen', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_006', 'Musik für Babys', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_007', 'Erste Hilfe am Kind', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_baby_kleinkind_008', 'Schlafberatung Baby', 'Baby & Kleinkind', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_001', 'Elterncoaching', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_002', 'Erziehungskurse', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_003', 'Kommunikation mit Kindern', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_004', 'Konflikte lösen Familie', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_005', 'Pubertät verstehen', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_006', 'Stressmanagement Eltern', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_007', 'Vereinbarkeit Familie & Beruf', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_elternkurse_coaching_008', 'Achtsamkeit für Eltern', 'Elternkurse & Coaching', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_001', 'Indoor Spielplatz', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_002', 'Freizeitpark Besuch', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_003', 'Zoo Erlebnis', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_004', 'Bauernhof Erlebnis', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_005', 'Familienausflug Natur', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_006', 'Erlebnispark', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_007', 'Kindergeburtstag Aktivitäten', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_freizeit_ausfluege_kinder_008', 'Ferienprogramme', 'Freizeit & Ausflüge mit Kindern', 'Familie & Kinder'),
  ('topic_sub_gemeinsame_familienerlebnisse_001', 'Outdoor Abenteuer Familie', 'Gemeinsame Familienerlebnisse', 'Familie & Kinder'),
  ('topic_sub_gemeinsame_familienerlebnisse_002', 'Familien Fotoshooting', 'Gemeinsame Familienerlebnisse', 'Familie & Kinder'),
  ('topic_sub_gemeinsame_familienerlebnisse_003', 'Kurzurlaub Familie', 'Gemeinsame Familienerlebnisse', 'Familie & Kinder'),
  ('topic_sub_sprachen_lernen_001', 'Englisch lernen', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_002', 'Deutsch lernen', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_003', 'Spanisch lernen', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_004', 'Französisch lernen', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_005', 'Italienisch lernen', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_006', 'Business Englisch', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_007', 'Konversationskurs', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_sprachen_lernen_008', 'Sprachzertifikat Vorbereitung', 'Sprachen lernen', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_001', 'Python programmieren', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_002', 'Webentwicklung (HTML, CSS)', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_003', 'JavaScript lernen', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_004', 'App Entwicklung', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_005', 'Data Science Grundlagen', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_006', 'Künstliche Intelligenz', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_007', 'Cloud Computing', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_programmieren_it_008', 'IT Grundlagen', 'Programmieren & IT', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_001', 'Excel Kurs', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_002', 'PowerPoint Training', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_003', 'Projektmanagement', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_004', 'Zeitmanagement', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_005', 'Prozessmanagement', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_006', 'Business Analyse', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_007', 'MS Office Grundlagen', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_business_buero_skills_008', 'Organisation im Büro', 'Business & Büro Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_001', 'SEO lernen', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_002', 'Google Ads (SEA)', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_003', 'Social Media Marketing', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_004', 'Content Marketing', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_005', 'E-Mail Marketing', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_006', 'Performance Marketing', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_007', 'Influencer Marketing', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_marketing_online_business_008', 'Online Business aufbauen', 'Marketing & Online Business', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_001', 'Fotografie Grundlagen', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_002', 'Bildbearbeitung (Photoshop, Lightroom...)', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_003', 'Grafikdesign', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_004', 'Videobearbeitung', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_005', 'Content Creation', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_006', 'UI/UX Design', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_007', 'Illustration', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_design_foto_video_008', 'Social Media Content erstellen', 'Design, Foto & Video', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_001', 'Mathe Nachhilfe', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_002', 'Deutsch Nachhilfe', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_003', 'Englisch Nachhilfe', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_004', 'Physik Nachhilfe', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_005', 'Chemie Nachhilfe', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_006', 'Lerntechniken', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_007', 'Hausaufgabenhilfe', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_schule_nachhilfe_008', 'Prüfungsvorbereitung Schule', 'Schule & Nachhilfe', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_001', 'Wissenschaftliches Arbeiten', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_002', 'Bachelorarbeit schreiben', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_003', 'Masterarbeit schreiben', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_004', 'Statistik Grundlagen', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_005', 'Präsentationen halten', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_006', 'Recherche Methoden', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_007', 'Zeitmanagement im Studium', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_studium_akademische_skills_008', 'Prüfungsvorbereitung Uni', 'Studium & akademische Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_001', 'Kommunikation verbessern', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_002', 'Rhetorik Training', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_003', 'Selbstbewusstsein stärken', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_004', 'Konfliktmanagement', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_005', 'Verhandlungstechniken', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_006', 'Körpersprache verstehen', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_007', 'Entscheidungsfindung', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_kommunikation_persoenliche_skills_008', 'Kritikfähigkeit', 'Kommunikation & persönliche Skills', 'Lernen & Weiterbildung'),
  ('topic_sub_abenteuer_001', 'Fallschirmsprung', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_002', 'Bungee Jumping', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_003', 'Canyoning', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_004', 'Rafting', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_005', 'Klettersteig', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_006', 'Survival Training', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_007', 'Höhlentour', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_abenteuer_008', 'Base Jump', 'Abenteuer', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_outdoor_natur_001', 'Wandern geführt', 'Outdoor & Natur', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_outdoor_natur_002', 'Schneeschuhwandern', 'Outdoor & Natur', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_outdoor_natur_003', 'Bergsteigen', 'Outdoor & Natur', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_outdoor_natur_004', 'Wildnis Camp', 'Outdoor & Natur', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_outdoor_natur_005', 'Nationalpark Tour', 'Outdoor & Natur', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_outdoor_natur_006', 'Kräuterwanderung', 'Outdoor & Natur', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_001', 'Kochkurs italienisch', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_002', 'Kochkurs asiatisch', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_003', 'Sushi Kochkurs', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_004', 'Vegan Kochkurs', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_005', 'Thai Kochkurs', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_006', 'Pasta Workshop', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_007', 'Grillkurs', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_008', 'BBQ Workshop', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_009', 'Steak Grillkurs', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_kochen_grillen_010', 'Bierverkostung', 'Kochen & Grillen', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wein_bier_tastings_001', 'Weinverkostung', 'Wein, Bier & Tastings', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wein_bier_tastings_002', 'Whisky Tasting', 'Wein, Bier & Tastings', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wein_bier_tastings_003', 'Gin Tasting', 'Wein, Bier & Tastings', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wein_bier_tastings_004', 'Rum Tasting', 'Wein, Bier & Tastings', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wein_bier_tastings_005', 'Kaffee Tasting', 'Wein, Bier & Tastings', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wein_bier_tastings_006', 'Cocktail Workshop', 'Wein, Bier & Tastings', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_001', 'Barista Kurs', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_002', 'Dinner in the Dark', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_003', 'Luxus Dinner', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_004', 'Gourmet Erlebnis', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_005', 'Private Chef Erlebnis', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_006', 'Candle Light Dinner', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_007', 'Dinner Event', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_essen_besondere_dinner_008', 'Degustationsmenü', 'Essen & besondere Dinner', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_001', 'Spa Tagespass', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_002', 'Massage Erlebnis', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_003', 'Sauna Erlebnis', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_004', 'Thermenbesuch', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_005', 'Yoga Retreat', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_006', 'Meditation Workshop', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_wellness_entspannung_007', 'Achtsamkeitskurs', 'Wellness & Entspannung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_001', 'Sportwagen fahren', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_002', 'Rennstrecke fahren', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_003', 'Quad fahren', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_004', 'Kart fahren', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_005', 'Motorrad Training', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_006', 'Offroad fahren', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_007', 'Drift Training', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_auto_motorsport_fahren_008', 'Jetski fahren', 'Auto, Motorsport & Fahren', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_001', 'Escape Room', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_002', 'Krimi Dinner', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_003', 'Comedy Show', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_004', 'Theater Workshop', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_005', 'Improvisation Kurs', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_006', 'Quiz Event', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_shows_spiele_unterhaltung_007', 'VR Erlebnis', 'Shows, Spiele & Unterhaltung', 'Erlebnisse & Aktivitäten'),
  ('topic_sub_fitness_training_001', 'Personal Training', 'Fitness & Training', 'Gesundheit & Fitness'),
  ('topic_sub_fitness_training_002', 'Fitnesskurs', 'Fitness & Training', 'Gesundheit & Fitness'),
  ('topic_sub_fitness_training_003', 'Krafttraining', 'Fitness & Training', 'Gesundheit & Fitness'),
  ('topic_sub_fitness_training_004', 'Ausdauertraining', 'Fitness & Training', 'Gesundheit & Fitness'),
  ('topic_sub_fitness_training_005', 'Functional Training', 'Fitness & Training', 'Gesundheit & Fitness'),
  ('topic_sub_fitness_training_006', 'HIIT Training', 'Fitness & Training', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_001', 'Ernährungsberatung', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_002', 'Abnehmen Coaching', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_003', 'Muskelaufbau Ernährung', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_004', 'Vegan Ernährung', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_005', 'Sporternährung', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_006', 'Diätberatung', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_ernaehrung_abnehmen_007', 'Gesunde Ernährung', 'Ernährung & Abnehmen', 'Gesundheit & Fitness'),
  ('topic_sub_yoga_meditation_001', 'Yoga Kurs', 'Yoga & Meditation', 'Gesundheit & Fitness'),
  ('topic_sub_yoga_meditation_002', 'Meditation lernen', 'Yoga & Meditation', 'Gesundheit & Fitness'),
  ('topic_sub_yoga_meditation_003', 'Achtsamkeitstraining', 'Yoga & Meditation', 'Gesundheit & Fitness'),
  ('topic_sub_yoga_meditation_004', 'Atemübungen', 'Yoga & Meditation', 'Gesundheit & Fitness'),
  ('topic_sub_yoga_meditation_005', 'Entspannungsübungen', 'Yoga & Meditation', 'Gesundheit & Fitness'),
  ('topic_sub_yoga_meditation_006', 'Mindfulness Training', 'Yoga & Meditation', 'Gesundheit & Fitness'),
  ('topic_sub_mental_health_wohlbefinden_001', 'Stressbewältigung', 'Mental Health & Wohlbefinden', 'Gesundheit & Fitness'),
  ('topic_sub_mental_health_wohlbefinden_002', 'Burnout Prävention', 'Mental Health & Wohlbefinden', 'Gesundheit & Fitness'),
  ('topic_sub_mental_health_wohlbefinden_003', 'Resilienz Training', 'Mental Health & Wohlbefinden', 'Gesundheit & Fitness'),
  ('topic_sub_mental_health_wohlbefinden_004', 'Coaching mentale Stärke', 'Mental Health & Wohlbefinden', 'Gesundheit & Fitness'),
  ('topic_sub_mental_health_wohlbefinden_005', 'Entspannungstechniken', 'Mental Health & Wohlbefinden', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_001', 'Gesundheitscheck', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_002', 'Rückentraining', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_003', 'Haltung verbessern', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_004', 'Präventionskurse', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_005', 'Beweglichkeit verbessern', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_006', 'Herz-Kreislauf Training', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_007', 'Ergonomie Training', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_gesundheit_praevention_008', 'Gesundheitsberatung', 'Gesundheit & Prävention', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_001', 'Physiotherapie', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_002', 'Massage Therapie', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_003', 'Osteopathie', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_004', 'Rehabilitation Training', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_005', 'Schmerztherapie', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_006', 'Faszien Training', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_007', 'Regenerationstechniken', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_therapie_regeneration_008', 'Sportmassage', 'Therapie & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_001', 'Schlafcoaching', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_002', 'Schlaf verbessern', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_003', 'Einschlaftraining', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_004', 'Abendroutinen', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_005', 'Stressfrei schlafen', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_006', 'Schlafanalyse', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_007', 'Regeneration im Alltag', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_schlaf_regeneration_008', 'Entspannungsrituale', 'Schlaf & Regeneration', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_001', 'Pilates Kurs', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_002', 'Rückenschule', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_003', 'Gleichgewichtstraining', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_004', 'Beweglichkeitstraining', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_005', 'Körperhaltung verbessern', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_006', 'Core Training', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_007', 'Stretching Kurs', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_koerper_balance_008', 'Balance Training', 'Körper & Balance', 'Gesundheit & Fitness'),
  ('topic_sub_malen_zeichnen_kunst_001', 'Malen lernen', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_002', 'Zeichnen lernen', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_003', 'Aquarell malen', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_004', 'Acrylmalerei', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_005', 'Ölmalerei', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_006', 'Skizzieren lernen', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_007', 'Porträt zeichnen', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_malen_zeichnen_kunst_008', 'Kunst für Anfänger', 'Malen, Zeichnen & Kunst', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_001', 'Gitarre lernen', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_002', 'Klavier lernen', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_003', 'Gesangsunterricht', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_004', 'Schlagzeug lernen', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_005', 'DJ Kurs', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_006', 'Musikproduktion', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_007', 'Songwriting', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_musik_instrumente_008', 'Tontechnik', 'Musik & Instrumente', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_001', 'Porträtfotografie', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_002', 'Landschaftsfotografie', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_003', 'Smartphone Fotografie', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_004', 'Bildbearbeitung (Photoshop...)', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_005', 'Lightroom Kurs', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_006', 'Studiofotografie', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_fotografie_bildbearbeitung_007', 'Kreative Fotografie', 'Fotografie & Bildbearbeitung', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_001', 'YouTube Videos erstellen', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_002', 'Social Media Content', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_003', 'Storytelling Video', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_004', 'Kamera Grundlagen', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_005', 'Kurzfilm erstellen', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_006', 'Reel & TikTok Produktion', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_video_content_creation_007', 'Videoproduktion', 'Video & Content Creation', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_001', 'Nähen lernen', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_002', 'Stricken lernen', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_003', 'Häkeln lernen', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_004', 'Upcycling Workshop', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_005', 'Makramee Kurs', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_006', 'Basteln', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_handarbeit_diy_007', 'Schmuck selber machen', 'Handarbeit & DIY', 'Kreativität & Hobbys'),
  ('topic_sub_toepfern_kreatives_gestalten_001', 'Töpfern lernen', 'Töpfern & kreatives Gestalten', 'Kreativität & Hobbys'),
  ('topic_sub_toepfern_kreatives_gestalten_002', 'Keramik Workshop', 'Töpfern & kreatives Gestalten', 'Kreativität & Hobbys'),
  ('topic_sub_toepfern_kreatives_gestalten_003', 'Modellieren', 'Töpfern & kreatives Gestalten', 'Kreativität & Hobbys'),
  ('topic_sub_toepfern_kreatives_gestalten_004', 'Skulpturen gestalten', 'Töpfern & kreatives Gestalten', 'Kreativität & Hobbys'),
  ('topic_sub_toepfern_kreatives_gestalten_005', 'Arbeiten mit Ton', 'Töpfern & kreatives Gestalten', 'Kreativität & Hobbys'),
  ('topic_sub_toepfern_kreatives_gestalten_006', 'Glas gestalten', 'Töpfern & kreatives Gestalten', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_001', 'Kreatives Schreiben', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_002', 'Storytelling lernen', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_003', 'Blog schreiben', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_004', 'Copywriting', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_005', 'Gedichte schreiben', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_006', 'Buch schreiben', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_007', 'Journaling', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schreiben_kreative_texte_008', 'Schreibwerkstatt', 'Schreiben & kreative Texte', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_001', 'Schauspielkurs', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_002', 'Improvisationstheater', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_003', 'Bühnenperformance', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_004', 'Körpersprache Training', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_005', 'Präsentation mit Wirkung', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_006', 'Sprechen vor Publikum', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_schauspiel_performance_007', 'Ausdruck & Stimme', 'Schauspiel & Performance', 'Kreativität & Hobbys'),
  ('topic_sub_finanzen_controlling_recht_001', 'Buchhaltung lernen', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_002', 'Controlling', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_003', 'Kostenrechnung', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_004', 'Steuern', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_005', 'Unternehmensfinanzen', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_006', 'Wirtschaftsrecht', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_007', 'Compliance', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_008', 'Rechnungswesen', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_009', 'Lohnverrechnung', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_finanzen_controlling_recht_010', 'Fußball', 'Finanzen, Controlling & Recht', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_001', 'Leadership Training', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_002', 'Mitarbeiter führen lernen', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_003', 'Teammanagement', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_004', 'Motivation im Team', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_005', 'Konfliktmanagement Führung', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_006', 'Mitarbeitergespräche führen', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_fuehrung_management_007', 'Change Management', 'Führung & Management', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_001', 'Selbstständig machen', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_002', 'Businessplan erstellen', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_003', 'Firma gründen', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_004', 'Online Business starten', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_005', 'Nebenberuflich selbstständig', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_006', 'Geschäftsmodell entwickeln', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_007', 'Startup Grundlagen', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_selbststaendigkeit_gruenden_008', 'Unternehmertum lernen', 'Selbstständigkeit & Gründen', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_001', 'Investieren lernen', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_002', 'Aktien Grundlagen', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_003', 'Immobilien investieren', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_004', 'Vermögensaufbau', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_005', 'Trading', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_006', 'Kryptowährungen', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_investieren_vermoegensaufbau_007', 'ETFs verstehen', 'Investieren & Vermögensaufbau', 'Karriere & Business'),
  ('topic_sub_marketing_vertrieb_001', 'Verkaufstraining', 'Marketing & Vertrieb', 'Karriere & Business'),
  ('topic_sub_marketing_vertrieb_002', 'Sales Strategien', 'Marketing & Vertrieb', 'Karriere & Business'),
  ('topic_sub_marketing_vertrieb_003', 'Kunden gewinnen', 'Marketing & Vertrieb', 'Karriere & Business'),
  ('topic_sub_marketing_vertrieb_004', 'Online Marketing', 'Marketing & Vertrieb', 'Karriere & Business'),
  ('topic_sub_kommunikation_verhandeln_001', 'Präsentationstraining', 'Kommunikation & Verhandeln', 'Karriere & Business'),
  ('topic_sub_kommunikation_verhandeln_002', 'Gesprächsführung', 'Kommunikation & Verhandeln', 'Karriere & Business'),
  ('topic_sub_kommunikation_verhandeln_003', 'Konflikte lösen', 'Kommunikation & Verhandeln', 'Karriere & Business'),
  ('topic_sub_kommunikation_verhandeln_004', 'Überzeugend argumentieren', 'Kommunikation & Verhandeln', 'Karriere & Business'),
  ('topic_sub_kommunikation_verhandeln_005', 'Pitch Training', 'Kommunikation & Verhandeln', 'Karriere & Business'),
  ('topic_sub_produktivitaet_organisation_001', 'Selbstorganisation', 'Produktivität & Organisation', 'Karriere & Business'),
  ('topic_sub_produktivitaet_organisation_002', 'Effizienz steigern', 'Produktivität & Organisation', 'Karriere & Business'),
  ('topic_sub_produktivitaet_organisation_003', 'Prioritäten setzen', 'Produktivität & Organisation', 'Karriere & Business'),
  ('topic_sub_produktivitaet_organisation_004', 'Arbeitsmethoden', 'Produktivität & Organisation', 'Karriere & Business'),
  ('topic_sub_produktivitaet_organisation_005', 'Planung & Struktur', 'Produktivität & Organisation', 'Karriere & Business'),
  ('topic_sub_produktivitaet_organisation_006', 'Ziele erreichen', 'Produktivität & Organisation', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_001', 'Bewerbung schreiben', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_002', 'Lebenslauf erstellen', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_003', 'Vorstellungsgespräch Training', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_004', 'Karriereplanung', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_005', 'Jobwechsel vorbereiten', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_006', 'Gehalt verhandeln', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_bewerbung_karriereplanung_007', 'Berufliche Neuorientierung', 'Bewerbung & Karriereplanung', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_001', 'PowerPoint', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_002', 'Projektmanagement Tools', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_003', 'CRM Systeme', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_004', 'Datenanalyse', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_005', 'Automatisierung', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_006', 'KI im Business', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_digitale_business_skills_007', 'Digitale Tools', 'Digitale Business Skills', 'Karriere & Business'),
  ('topic_sub_ballsport_teamsport_001', 'Basketball', 'Ballsport & Teamsport', 'Sport & Bewegung'),
  ('topic_sub_ballsport_teamsport_002', 'Volleyball', 'Ballsport & Teamsport', 'Sport & Bewegung'),
  ('topic_sub_ballsport_teamsport_003', 'Tennis', 'Ballsport & Teamsport', 'Sport & Bewegung'),
  ('topic_sub_ballsport_teamsport_004', 'Badminton', 'Ballsport & Teamsport', 'Sport & Bewegung'),
  ('topic_sub_ballsport_teamsport_005', 'Tischtennis', 'Ballsport & Teamsport', 'Sport & Bewegung'),
  ('topic_sub_ballsport_teamsport_006', 'Padel', 'Ballsport & Teamsport', 'Sport & Bewegung'),
  ('topic_sub_wassersport_001', 'Surfen', 'Wassersport', 'Sport & Bewegung'),
  ('topic_sub_wassersport_002', 'Stand Up Paddling (SUP)', 'Wassersport', 'Sport & Bewegung'),
  ('topic_sub_wassersport_003', 'Segeln', 'Wassersport', 'Sport & Bewegung'),
  ('topic_sub_wassersport_004', 'Tauchen', 'Wassersport', 'Sport & Bewegung'),
  ('topic_sub_wassersport_005', 'Kajak / Kanufahren', 'Wassersport', 'Sport & Bewegung'),
  ('topic_sub_wassersport_006', 'Windsurfen', 'Wassersport', 'Sport & Bewegung'),
  ('topic_sub_wintersport_001', 'Skifahren', 'Wintersport', 'Sport & Bewegung'),
  ('topic_sub_wintersport_002', 'Snowboarden', 'Wintersport', 'Sport & Bewegung'),
  ('topic_sub_wintersport_003', 'Langlaufen', 'Wintersport', 'Sport & Bewegung'),
  ('topic_sub_wintersport_004', 'Eislaufen', 'Wintersport', 'Sport & Bewegung'),
  ('topic_sub_wintersport_005', 'Skitouren', 'Wintersport', 'Sport & Bewegung'),
  ('topic_sub_outdoor_bergsport_001', 'Klettern / Bouldern', 'Outdoor & Bergsport', 'Sport & Bewegung'),
  ('topic_sub_outdoor_bergsport_002', 'Mountainbiken', 'Outdoor & Bergsport', 'Sport & Bewegung'),
  ('topic_sub_outdoor_bergsport_003', 'Trailrunning', 'Outdoor & Bergsport', 'Sport & Bewegung'),
  ('topic_sub_outdoor_bergsport_004', 'Paragliding', 'Outdoor & Bergsport', 'Sport & Bewegung'),
  ('topic_sub_kampfsport_selbstverteidigung_001', 'Boxen', 'Kampfsport & Selbstverteidigung', 'Sport & Bewegung'),
  ('topic_sub_kampfsport_selbstverteidigung_002', 'Kickboxen', 'Kampfsport & Selbstverteidigung', 'Sport & Bewegung'),
  ('topic_sub_kampfsport_selbstverteidigung_003', 'Judo', 'Kampfsport & Selbstverteidigung', 'Sport & Bewegung'),
  ('topic_sub_kampfsport_selbstverteidigung_004', 'Karate', 'Kampfsport & Selbstverteidigung', 'Sport & Bewegung'),
  ('topic_sub_kampfsport_selbstverteidigung_005', 'MMA', 'Kampfsport & Selbstverteidigung', 'Sport & Bewegung'),
  ('topic_sub_kampfsport_selbstverteidigung_006', 'Selbstverteidigung', 'Kampfsport & Selbstverteidigung', 'Sport & Bewegung'),
  ('topic_sub_trendsport_fun_sport_001', 'Parkour', 'Trendsport & Fun-Sport', 'Sport & Bewegung'),
  ('topic_sub_trendsport_fun_sport_002', 'Slackline', 'Trendsport & Fun-Sport', 'Sport & Bewegung'),
  ('topic_sub_trendsport_fun_sport_003', 'Skateboard', 'Trendsport & Fun-Sport', 'Sport & Bewegung'),
  ('topic_sub_trendsport_fun_sport_004', 'Longboard', 'Trendsport & Fun-Sport', 'Sport & Bewegung'),
  ('topic_sub_trendsport_fun_sport_005', 'Trampolin', 'Trendsport & Fun-Sport', 'Sport & Bewegung'),
  ('topic_sub_trendsport_fun_sport_006', 'Ninja Warrior Training', 'Trendsport & Fun-Sport', 'Sport & Bewegung'),
  ('topic_sub_tanz_bewegungskurse_001', 'Salsa', 'Tanz & Bewegungskurse', 'Sport & Bewegung'),
  ('topic_sub_tanz_bewegungskurse_002', 'Bachata', 'Tanz & Bewegungskurse', 'Sport & Bewegung'),
  ('topic_sub_tanz_bewegungskurse_003', 'Hip-Hop', 'Tanz & Bewegungskurse', 'Sport & Bewegung'),
  ('topic_sub_tanz_bewegungskurse_004', 'Standardtanz', 'Tanz & Bewegungskurse', 'Sport & Bewegung'),
  ('topic_sub_tanz_bewegungskurse_005', 'Breakdance', 'Tanz & Bewegungskurse', 'Sport & Bewegung');

create temp table if not exists vm_topic_id_migration_20260620 (
  old_topic_id text primary key,
  new_topic_id text not null,
  old_topic_name text not null,
  new_topic_name text not null
);
truncate table vm_topic_id_migration_20260620;
-- Keine zusaetzlichen ID-Remaps noetig: alle weitergefuehrten alten Themen behalten ihre Topic-ID.

create temp table if not exists vm_new_topic_ids_20260620 (topic_id text primary key);
truncate table vm_new_topic_ids_20260620;
insert into vm_new_topic_ids_20260620 (topic_id)
select distinct topic->>'id'
from vm_new_categories_20260620 source
cross join lateral jsonb_array_elements(source.payload) category
cross join lateral jsonb_array_elements(coalesce(category->'subcategories', '[]'::jsonb)) subcategory
cross join lateral jsonb_array_elements(coalesce(subcategory->'topics', '[]'::jsonb)) topic
where coalesce(topic->>'id', '') <> '';

create temp table if not exists vm_provider_unclear_topics_20260620 (
  provider_ord bigint primary key,
  provider_id text,
  provider_name text,
  unclear_topics text,
  note_id text
);
truncate table vm_provider_unclear_topics_20260620;

insert into vm_provider_unclear_topics_20260620 (provider_ord, provider_id, provider_name, unclear_topics, note_id)
select
  provider_entry.provider_ord,
  coalesce(provider_entry.provider->>'id', provider_entry.provider->>'provider_id', '') as provider_id,
  coalesce(provider_entry.provider->>'name', provider_entry.provider->>'provider_name', '') as provider_name,
  string_agg(
    coalesce(old_lookup.old_topic_name, topic_id_entry.old_topic_id) || ' [' || topic_id_entry.old_topic_id || ']',
    ', '
    order by topic_id_entry.topic_ord
  ) as unclear_topics,
  'note_category_migration_20260620_' || md5(coalesce(provider_entry.provider->>'id', provider_entry.provider->>'provider_id', provider_entry.provider_ord::text)) as note_id
from public.app_state state_row
cross join lateral jsonb_array_elements(coalesce(state_row.payload->'providers', '[]'::jsonb)) with ordinality provider_entry(provider, provider_ord)
cross join lateral jsonb_array_elements_text(coalesce(provider_entry.provider->'topicIds', '[]'::jsonb)) with ordinality topic_id_entry(old_topic_id, topic_ord)
left join vm_new_topic_ids_20260620 new_topic on new_topic.topic_id = topic_id_entry.old_topic_id
left join vm_topic_id_migration_20260620 migration on migration.old_topic_id = topic_id_entry.old_topic_id
left join vm_old_topic_lookup_20260620 old_lookup on old_lookup.old_topic_id = topic_id_entry.old_topic_id
where state_row.id = 'main'
  and new_topic.topic_id is null
  and migration.new_topic_id is null
group by provider_entry.provider_ord, provider_entry.provider
having count(*) > 0;

with migrated_providers as (
  select
    state_row.id,
    coalesce(
      jsonb_agg(
        case
          when provider_entry.provider is null then null
          when jsonb_typeof(provider_entry.provider) <> 'object' then provider_entry.provider
          else (
            with provider_topics as (
              select coalesce(
                (
                  select jsonb_agg(to_jsonb(mapped_topic_id) order by first_ord)
                  from (
                    select
                      coalesce(
                        migration.new_topic_id,
                        case when new_topic.topic_id is not null then topic_id_entry.old_topic_id end,
                        topic_id_entry.old_topic_id
                      ) as mapped_topic_id,
                      min(topic_id_entry.topic_ord) as first_ord
                    from jsonb_array_elements_text(coalesce(provider_entry.provider->'topicIds', '[]'::jsonb)) with ordinality topic_id_entry(old_topic_id, topic_ord)
                    left join vm_topic_id_migration_20260620 migration on migration.old_topic_id = topic_id_entry.old_topic_id
                    left join vm_new_topic_ids_20260620 new_topic on new_topic.topic_id = topic_id_entry.old_topic_id
                    where coalesce(topic_id_entry.old_topic_id, '') <> ''
                    group by mapped_topic_id
                  ) deduped_topics
                ),
                '[]'::jsonb
              ) as topic_ids
            ), provider_with_topics as (
              select jsonb_set(provider_entry.provider, '{topicIds}', provider_topics.topic_ids, true) as provider_json
              from provider_topics
            )
            select case
              when unclear.provider_ord is null then provider_with_topics.provider_json
              when exists (
                select 1
                from jsonb_array_elements(coalesce(provider_with_topics.provider_json->'notes', '[]'::jsonb)) existing_note
                where existing_note->>'id' = unclear.note_id
              ) then provider_with_topics.provider_json
              else jsonb_set(
                provider_with_topics.provider_json,
                '{notes}',
                coalesce(provider_with_topics.provider_json->'notes', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                  'id', unclear.note_id,
                  'text', 'Kategoriezuordnung pruefen: Bei der Migration auf Neue Kat.csv vom 2026-06-20 konnten diese alten Themen nicht eindeutig zugeordnet werden: ' || unclear.unclear_topics,
                  'createdAt', now()::text,
                  'createdByUserId', 'system_category_migration',
                  'createdByName', 'Kategorie-Migration',
                  'createdByRole', 'admin',
                  'task', false,
                  'done', false
                )),
                true
              )
            end
            from provider_with_topics
          )
        end
        order by provider_entry.provider_ord
      ) filter (where provider_entry.provider is not null),
      '[]'::jsonb
    ) as providers
  from public.app_state state_row
  left join lateral jsonb_array_elements(coalesce(state_row.payload->'providers', '[]'::jsonb)) with ordinality provider_entry(provider, provider_ord) on true
  left join vm_provider_unclear_topics_20260620 unclear on unclear.provider_ord = provider_entry.provider_ord
  where state_row.id = 'main'
  group by state_row.id
)
update public.app_state state_row
set payload = jsonb_set(
      jsonb_set(coalesce(state_row.payload, '{}'::jsonb), '{categories}', (select payload from vm_new_categories_20260620 limit 1), true),
      '{providers}',
      migrated_providers.providers,
      true
    ),
    updated_at = now()
from migrated_providers
where state_row.id = migrated_providers.id;

select
  (select jsonb_array_length(payload) from vm_new_categories_20260620 limit 1) as categories_imported,
  (select count(*) from vm_new_topic_ids_20260620) as topics_imported,
  (select count(*) from vm_topic_id_migration_20260620) as topic_id_remaps,
  (select count(*) from vm_provider_unclear_topics_20260620) as providers_marked_for_review;

select provider_id, provider_name, unclear_topics
from vm_provider_unclear_topics_20260620
order by provider_name, provider_id;
