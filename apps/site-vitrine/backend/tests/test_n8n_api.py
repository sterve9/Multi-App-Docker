#!/usr/bin/env python3
"""
Test de connexion API n8n - Version Debug
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

N8N_URL = "https://automation.sterveshop.cloud"
N8N_API_KEY = os.getenv("N8N_API_KEY")

def test_n8n_api():
    """Teste la connexion à l'API n8n avec debug détaillé"""
    
    print("\n" + "="*60)
    print("🔍 DEBUG API n8n")
    print("="*60)
    
    # Vérifier la clé
    if not N8N_API_KEY:
        print("❌ N8N_API_KEY manquante dans .env")
        return False
    
    print(f"\n📋 Configuration:")
    print(f"  URL: {N8N_URL}")
    print(f"  Clé: {N8N_API_KEY[:20]}... (longueur: {len(N8N_API_KEY)})")
    
    # Test 1 : Health Check
    print("\n1️⃣ Health Check...")
    try:
        r = requests.get(f"{N8N_URL}/healthz", timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            print("  ✅ n8n est accessible")
        else:
            print(f"  ❌ Erreur: {r.text}")
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return False
    
    # Test 2 : API avec détails
    print("\n2️⃣ Test API...")
    
    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    }
    
    print(f"  Headers envoyés:")
    print(f"    X-N8N-API-KEY: {N8N_API_KEY[:30]}...")
    
    try:
        r = requests.get(
            f"{N8N_URL}/api/v1/workflows",
            headers=headers,
            timeout=10
        )
        
        print(f"  Status HTTP: {r.status_code}")
        print(f"  Headers réponse: {dict(r.headers)}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"  ✅ Succès ! Workflows: {len(data.get('data', []))}")
            return True
        
        elif r.status_code == 401:
            print(f"  ❌ 401 Unauthorized")
            print(f"  Réponse: {r.text}")
            
            # Suggestions
            print(f"\n💡 Suggestions:")
            print(f"  1. Regénère une nouvelle clé API dans n8n")
            print(f"  2. Vérifie que l'API est activée dans n8n")
            print(f"  3. Redémarre n8n après avoir modifié .env")
            return False
        
        else:
            print(f"  ❌ Status inattendu: {r.status_code}")
            print(f"  Réponse: {r.text}")
            return False
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return False

if __name__ == "__main__":
    success = test_n8n_api()
    
    print("\n" + "="*60)
    if success:
        print("✅ CONNEXION RÉUSSIE")
    else:
        print("❌ CONNEXION ÉCHOUÉE")
    print("="*60)
