#!/usr/bin/env python3
"""
Script de test pour le lead scoring
Teste 3 types de leads : HOT, WARM, COLD
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_lead(name: str, data: dict):
    """Teste un lead et affiche le résultat"""
    print(f"\n{'='*70}")
    print(f"🧪 TEST : {name}")
    print('='*70)
    
    try:
        response = requests.post(f"{BASE_URL}/api/contact", json=data)
        
        if response.status_code == 200:
            result = response.json()
            analysis = result.get("analysis", {})
            
            # Afficher résultats
            score = analysis.get("priority_score", 0)
            priority = analysis.get("priority", "unknown")
            
            # Emoji selon score
            if score >= 8:
                emoji = "🔥"
                label = "HOT LEAD"
            elif score >= 5:
                emoji = "⚡"
                label = "WARM LEAD"
            else:
                emoji = "❄️"
                label = "COLD LEAD"
            
            print(f"\n{emoji} {label}")
            print(f"Score : {score}/10")
            print(f"Priorité : {priority}")
            print(f"Catégorie : {analysis.get('category', 'N/A')}")
            print(f"Action : {analysis.get('next_action', 'N/A')}")
            print(f"Résumé : {analysis.get('summary', 'N/A')}")
            print(f"\nn8n déclenché : {'✅' if result.get('n8n_triggered') else '❌'}")
            
            return True
            
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            print(f"Détail : {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception : {e}")
        return False

def main():
    print("\n" + "="*70)
    print("🚀 TEST COMPLET DU LEAD SCORING")
    print("="*70)
    
    # Test 1 : HOT LEAD (score attendu : 8-10)
    hot_lead = {
        "name": "Sophie Martin",
        "email": "sophie@techcorp.com",
        "phone": "+216 98765432",
        "subject": "Automatisation urgente CRM",
        "message": "Bonjour, je suis CEO de TechCorp. Nous avons un budget de 8000€ pour automatiser notre CRM et nos ventes. Nous voulons démarrer dès la semaine prochaine car notre équipe commerciale perd trop de temps sur les tâches manuelles. Pouvez-vous nous appeler rapidement ?"
    }
    
    # Test 2 : WARM LEAD (score attendu : 5-7)
    warm_lead = {
        "name": "Ahmed Ben Ali",
        "email": "ahmed@startup.tn",
        "phone": "+216 55123456",
        "subject": "Projet d'automatisation e-commerce",
        "message": "Bonjour, je suis responsable marketing dans une startup e-commerce. Nous aimerions automatiser nos campagnes email et notre gestion de stock avec n8n. Notre timeline est de 2-3 mois. Pouvez-vous nous envoyer un devis ?"
    }
    
    # Test 3 : COLD LEAD (score attendu : 1-4)
    cold_lead = {
        "name": "Étudiant Curieux",
        "email": "etudiant@gmail.com",
        "phone": "",
        "subject": "Question sur n8n",
        "message": "Bonjour, je suis étudiant en informatique et je découvre n8n. C'est quoi exactement et comment ça marche ?"
    }
    
    # Lancer tests
    results = []
    results.append(("HOT LEAD", test_lead("HOT LEAD", hot_lead)))
    results.append(("WARM LEAD", test_lead("WARM LEAD", warm_lead)))
    results.append(("COLD LEAD", test_lead("COLD LEAD", cold_lead)))
    
    # Résumé
    print("\n" + "="*70)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name:15} : {status}")
    
    print(f"\nRésultat : {passed}/{total} tests réussis")
    
    if passed == total:
        print("\n🎉 TOUS LES TESTS SONT PASSÉS !")
        return True
    else:
        print("\n⚠️ Certains tests ont échoué")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
