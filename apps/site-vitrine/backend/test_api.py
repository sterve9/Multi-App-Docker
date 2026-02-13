#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test(name, method, endpoint, data=None):
    """Lance un test et affiche le résultat"""
    print(f"\n{'='*60}")
    print(f"✅ {name}")
    print('='*60)
    
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            r = requests.get(url)
        else:
            r = requests.post(url, json=data)
        
        print(f"Status: {r.status_code}")
        
        try:
            result = r.json()
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Validation pour /api/contact
            if endpoint == "/api/contact" and r.status_code == 200:
                if "analysis" in result:
                    analysis = result["analysis"]
                    print(f"\n📊 Résumé:")
                    print(f"  • Catégorie: {analysis.get('category')}")
                    print(f"  • Priorité: {analysis.get('priority_score')}/10")
                    print(f"  • Température: {analysis.get('lead_temperature')}")
                    print(f"  • Budget: {analysis.get('budget_signal')}")
                    print(f"  • Action suggérée: {analysis.get('suggested_action')}")
        except:
            print(r.text)
    
    except Exception as e:
        print(f"❌ Erreur: {e}")

# ============================================
# TESTS
# ============================================

print("\n" + "="*60)
print("🧪 TESTS API BACKEND")
print("="*60)

# Tests basiques
test("Health Check", "GET", "/")
test("Health Status", "GET", "/health")
test("Debug Env", "GET", "/debug/env")

# Tests analyse
test("Test 1: Automation (n8n)", "POST", "/api/contact", {
    "name": "Jean Dupont",
    "email": "jean@test.com",
    "phone": "0600000001",
    "message": "Je veux automatiser mes leads avec n8n"
})

test("Test 2: Website (e-commerce)", "POST", "/api/contact", {
    "name": "Alice Martin",
    "email": "alice@test.com",
    "phone": "0600000002",
    "message": "Je veux creer un site e-commerce pour vendre mes produits"
})

test("Test 3: AI (chatbot)", "POST", "/api/contact", {
    "name": "Bob Morane",
    "email": "bob@test.com",
    "phone": "0600000003",
    "message": "Je veux integrer un chatbot IA sur mon site web"
})

test("Test 4: Consulting", "POST", "/api/contact", {
    "name": "Clara Dubois",
    "email": "clara@test.com",
    "phone": "0600000004",
    "message": "J'ai besoin de conseils pour optimiser mon workflow"
})

test("Test 5: Unknown", "POST", "/api/contact", {
    "name": "Test User",
    "email": "test@test.com",
    "phone": "0600000005",
    "message": "Bonjour"
})

# Tests validation
test("Test 6: Email invalide (doit echouer)", "POST", "/api/contact", {
    "name": "Test",
    "email": "pas-un-email",
    "phone": "0600000006",
    "message": "Test message"
})

test("Test 7: Champ manquant (doit echouer)", "POST", "/api/contact", {
    "name": "Test",
    "email": "test@test.com",
    "phone": "0600000007"
})

print("\n" + "="*60)
print("✅ TESTS TERMINÉS")
print("="*60 + "\n")
