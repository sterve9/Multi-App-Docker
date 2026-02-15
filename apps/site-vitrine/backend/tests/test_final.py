#!/usr/bin/env python3
import requests
import json

url = "http://127.0.0.1:8000/api/contact"

data = {
    "name": "Audit Final",
    "email": "audit@test.com",
    "message": "Test complet avant déploiement production"
}

print("\n🧪 TEST FINAL AVANT DÉPLOIEMENT")
print("="*60)

try:
    response = requests.post(url, json=data)
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ SUCCÈS !")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if result.get("n8n_triggered"):
            print("\n✅ n8n déclenché avec succès !")
            print("\nVérifie maintenant :")
            print("  1. Email reçu dans Gmail")
            print("  2. Ligne ajoutée dans Google Sheets")
            print("  3. Exécution visible dans n8n")
        else:
            print("\n⚠️ n8n n'a pas été déclenché")
    else:
        print(f"\n❌ Erreur {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\n❌ Exception: {e}")

print("\n" + "="*60)
