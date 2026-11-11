# -*- coding: utf-8 -*-
"""TaskFlow manuel güvenlik testleri. Backend http://localhost:4000 çalışıyor olmalı."""
import json, hmac, hashlib, base64, time, urllib.request, urllib.error

API = "http://localhost:4000"
SECRET = b"super-gizli-anahtar-degistir"

def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def make_token(payload, alg="HS256", secret=SECRET, tamper=False):
    header = {"alg": alg, "typ": "JWT"}
    h = b64url(json.dumps(header, separators=(",", ":")).encode())
    p = b64url(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{h}.{p}".encode()
    if alg == "none":
        return f"{h}.{p}."
    sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
    token = f"{h}.{p}.{b64url(sig)}"
    if tamper:
        # payload'ı bozup imzayı olduğu gibi bırak -> imza doğrulaması başarısız olmalı
        payload2 = dict(payload); payload2["id"] = 9999
        p2 = b64url(json.dumps(payload2, separators=(",", ":")).encode())
        token = f"{h}.{p2}.{b64url(sig)}"
    return token

def req(method, path, token=None, body=None, raw_body=None, headers=None):
    url = API + path
    data = None
    hdr = headers or {}
    if body is not None:
        data = json.dumps(body).encode()
        hdr["Content-Type"] = "application/json"
    if raw_body is not None:
        data = raw_body.encode()
        hdr["Content-Type"] = "application/json"
    if token:
        hdr["Authorization"] = "Bearer " + token
    r = urllib.request.Request(url, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read().decode(errors="replace"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace"), dict(e.headers)
    except Exception as e:
        return -1, str(e), {}

def login(email, password):
    s, t, _ = req("POST", "/api/auth/login", body={"email": email, "password": password})
    if s == 200:
        return json.loads(t)["token"]
    return None

results = []
def check(no, desc, expected, status, body, secure):
    short = body[:90].replace("\n", " ")
    mark = "GUVENLI" if secure else "ACIK/RISK"
    results.append((no, desc, expected, status, mark))
    print(f"[{no:>2}] {desc}\n     Beklenen: {expected} | Donen: HTTP {status} | {mark}\n     Yanit: {short}\n")

print("="*70)
print("TASKFLOW MANUEL GUVENLIK TESTLERI")
print("="*70 + "\n")

# Kullanıcılar
umut = login("umut@taskflow.dev", "demo1234")      # admin (board 1)
elif_ = login("elif@taskflow.dev", "demo1234")     # member (board 1)
# Dışarıdan kullanıcı (board 1 üyesi DEĞİL)
req("POST", "/api/auth/register", body={"name": "Disari Biri", "email": "disari@taskflow.dev", "password": "disari123"})
disari = login("disari@taskflow.dev", "disari123")
print(f"Token'lar alindi: umut={bool(umut)} elif={bool(elif_)} disari={bool(disari)}\n")

# ---- A) YETKILENDIRME / ERISIM ----
print("--- A) YETKILENDIRME / ERISIM ---\n")
s,b,_ = req("GET", "/api/boards"); check(1, "Token'siz istek (GET /api/boards)", "401", s, b, s==401)
s,b,_ = req("DELETE", "/api/boards/1", token=elif_); check(2, "Uye (member) pano silmeye calisiyor", "403", s, b, s==403)
s,b,_ = req("POST", "/api/boards/1/members", token=elif_, body={"email":"x@x.com"}); check(3, "Uye (member) uye davet ediyor", "403", s, b, s==403)
s,b,_ = req("GET", "/api/boards/1", token=disari); check(4, "IDOR: uyesi olmayan kullanici board detayi", "403", s, b, s==403)
s,b,_ = req("GET", "/api/boards/1/lists", token=disari); check(5, "IDOR: uyesi olmayan kullanici listeler", "403", s, b, s==403)
s,b,_ = req("PATCH", "/api/cards/1/move", token=disari, body={"list_id":2,"position":0}); check(6, "IDOR: uyesi olmayan kullanici kart tasima", "403", s, b, s==403)
s,b,_ = req("PUT", "/api/boards/1/lists/1", token=disari, body={"title":"hack"}); check(7, "IDOR: uyesi olmayan kullanici liste guncelleme", "403", s, b, s==403)

# ---- B) KIMLIK DOGRULAMA / OTURUM ----
print("--- B) KIMLIK DOGRULAMA / OTURUM ---\n")
tampered = make_token({"id":1,"email":"umut@taskflow.dev","name":"Umut Boran"}, tamper=True)
s,b,_ = req("GET", "/api/boards", token=tampered); check(8, "Kurcalanmis JWT (payload degistirilmis, imza ayni)", "401", s, b, s==401)
none_tok = make_token({"id":1,"email":"umut@taskflow.dev","name":"Umut Boran"}, alg="none")
s,b,_ = req("GET", "/api/boards", token=none_tok); check(9, "alg:none token (imzasiz)", "401", s, b, s==401)
expired = make_token({"id":1,"email":"umut@taskflow.dev","name":"Umut Boran","exp":int(time.time())-3600})
s,b,_ = req("GET", "/api/boards", token=expired); check(10, "Suresi dolmus token", "401", s, b, s==401)
s,b,_ = req("POST", "/api/auth/register", body={"name":"a","email":"kisa@x.com","password":"1"}); check(11, "Cok kisa sifre (1 karakter) ile kayit", "400 (reddedilmeli)", s, b, s==400)
s1,_,_ = req("POST","/api/auth/login", body={"email":"yokboyle@x.com","password":"x"})
s2,_,_ = req("POST","/api/auth/login", body={"email":"umut@taskflow.dev","password":"yanlis"})
check(12, "Kullanici numaralandirma (login: olmayan email vs yanlis sifre ayni mesaj mi)", "ikisi de ayni 401", f"{s1}/{s2}", "iki durum ayni", s1==401 and s2==401)
s,b,_ = req("POST", "/api/auth/register", body={"name":"a","email":"umut@taskflow.dev","password":"password123"}); check(13, "Kullanici numaralandirma (register: var olan email)", "genel mesaj tercih edilir", s, b, s!=409)

# ---- C) GIRDI DOGRULAMA ----
print("--- C) GIRDI DOGRULAMA ---\n")
s,b,_ = req("POST","/api/auth/login", body={"email":"' OR '1'='1' --","password":"x"}); check(15, "SQLi login bypass denemesi (' OR '1'='1' --)", "401 (bypass olmamali)", s, b, s==401)
# SQLi kart basligina
sqli_title = "x'); DROP TABLE cards;--"
s,b,_ = req("POST","/api/lists/1/cards", token=umut, body={"title": sqli_title})
# cards tablosu hala duruyor mu?
s2,b2,_ = req("GET","/api/lists/1/cards", token=umut)
check(16, "SQLi kart basligina (parametreli sorgu literal saklamali)", "kart olusur, tablo durur", s, b, s==201 and s2==200)
# XSS payload'lı kart
xss = "<script>alert('xss')</script>"
s,b,_ = req("POST","/api/lists/1/cards", token=umut, body={"title": xss}); check(17, "XSS payload'li kart olusturma (render arayuzde kontrol edilir)", "201 (React escape eder)", s, b, s==201)
# position negatif
s,b,_ = req("PATCH","/api/cards/1/move", token=umut, body={"list_id":1,"position":-5}); check(18, "Negatif position degeri ile tasima", "400 (reddedilmeli)", s, b, s==400)
# gecersiz id
s,b,_ = req("PATCH","/api/cards/abc/move", token=umut, body={"list_id":1,"position":0}); check(181, "Gecersiz kart id (abc)", "temiz hata (500 olmamali ideal)", s, b, s in (400,404))

# ---- D) YAPILANDIRMA ----
print("--- D) YAPILANDIRMA ---\n")
s,b,H = req("GET","/health")
xpb = H.get("X-Powered-By") or H.get("x-powered-by")
csp = H.get("Content-Security-Policy")
xfo = H.get("X-Frame-Options")
xcto = H.get("X-Content-Type-Options")
hsts = H.get("Strict-Transport-Security")
aco = H.get("Access-Control-Allow-Origin")
print(f"[19] Guvenlik basliklari:\n     X-Powered-By: {xpb}\n     Content-Security-Policy: {csp}\n     X-Frame-Options: {xfo}\n     X-Content-Type-Options: {xcto}\n     Strict-Transport-Security: {hsts}\n")
check(19, "Guvenlik basliklari (CSP/XFO/XCTO/HSTS) mevcut mu", "hepsi olmali", "eksik" if not (csp and xfo and xcto) else "var", "", bool(csp and xfo and xcto))
check(20, f"X-Powered-By surum sizintisi = {xpb}", "olmamali", "sizinti" if xpb else "yok", str(xpb), not xpb)
check(21, f"CORS Access-Control-Allow-Origin = {aco}", "* olmamali (whitelist)", aco or "yok", "", aco not in ("*",))
# Hata / stack trace sizintisi (bozuk JSON govde)
s,b,_ = req("POST","/api/auth/login", raw_body="{bozuk json")
leaks_stack = ("at " in b and (".js:" in b or "\\" in b)) or "stack" in b.lower()
check(22, "Hata yanitinda stack trace sizintisi (bozuk JSON)", "stack sizmamali", "stack sizdi" if leaks_stack else "temiz", b[:80], not leaks_stack)

# ---- E) BRUTE FORCE / RATE LIMIT (en sonda; limiter diger testleri bozmasin) ----
print("--- E) BRUTE FORCE / RATE LIMIT ---\n")
codes = []
for i in range(12):
    sc,_,_ = req("POST","/api/auth/login", body={"email":"umut@taskflow.dev","password":"yanlis"+str(i)})
    codes.append(sc)
has_429 = 429 in codes
check(14, f"Brute force / rate limit (12 hizli hatali giris)", "429 gorulmeli", "429 var" if has_429 else "429 YOK", str(codes), has_429)

# ---- OZET ----
print("\n" + "="*70)
print("OZET TABLOSU")
print("="*70)
print(f"{'#':>3} | {'Sonuc':<10} | Test")
print("-"*70)
for no, desc, exp, st, mark in results:
    print(f"{str(no):>3} | {mark:<10} | {desc[:55]}")
riskli = [r for r in results if r[4] != "GUVENLI"]
print("-"*70)
print(f"Toplam: {len(results)} test | Guvenli: {len(results)-len(riskli)} | Acik/Risk: {len(riskli)}")
