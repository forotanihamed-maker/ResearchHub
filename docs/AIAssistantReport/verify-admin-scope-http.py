import requests, re, json
B="http://localhost:3400"
PW="Test12345!"
def login(email):
    s=requests.Session(); r=s.post(B+"/api/auth/login",json={"email":email,"password":PW})
    assert r.status_code==200,(email,r.status_code,r.text[:200])
    m=re.search(r"auth_token=([^;]+)",r.headers.get("set-cookie","")); s.cookies.clear(); s.headers["Cookie"]="auth_token="+m.group(1); return s
res=[]
def check(name, cond, extra=""):
    res.append(cond); print(("PASS " if cond else "FAIL ")+name+(" "+str(extra) if extra else ""))
def titles(s): 
    r=s.get(B+"/api/admin/projects"); return r.status_code, sorted(p["title"] for p in r.json().get("projects",[])) if r.status_code==200 else None
A=login("admin.a@t.io"); Bs=login("admin.b@t.io"); N=login("admin.none@t.io"); S=login("stu@t.io"); P=login("prof.a@t.io")
# projects
check("AdminA sees only dept-A projects", titles(A)==(200,["P1-A","P3-A"]), titles(A))
check("AdminB sees only dept-B projects", titles(Bs)==(200,["P2-B","P4-B","P5-B"]), titles(Bs))
check("Admin without departments -> empty list", titles(N)==(200,[]), titles(N))
check("Student -> 403", requests.get(B+"/api/admin/projects",headers=S.headers).status_code==403)
check("Professor -> 403", requests.get(B+"/api/admin/projects",headers=P.headers).status_code==403)
check("Unauthenticated -> 401", requests.get(B+"/api/admin/projects").status_code==401)
# stats
def st(s): r=s.get(B+"/api/admin/stats"); return r.status_code, (r.json().get("projects"), r.json().get("students"), r.json().get("professors")) if r.status_code==200 else None
check("AdminA stats projects=2", st(A)[1][0]==2, st(A))
check("AdminB stats projects=3", st(Bs)[1][0]==3, st(Bs))
check("Admin without departments stats projects=0", st(N)==(200,(0,0,0)), st(N))
check("Student stats -> 403", requests.get(B+"/api/admin/stats",headers=S.headers).status_code==403)
check("Unauthenticated stats -> 401", requests.get(B+"/api/admin/stats").status_code==401)
# row shape unchanged
r=A.get(B+"/api/admin/projects").json()["projects"][0]
check("row shape still has expected fields", all(k in r for k in ["id","title","status","memberCount","pendingApplications","professorName","professorDepartment"]), sorted(r.keys()))
# side finding probe: can an admin widen their own scope?
dep=A.get(B+"/api/admin/departments").json()
r=A.patch(B+"/api/admin/departments",json={"departments":dep["departments"]})
print("SIDE-FINDING PROBE: AdminA PATCH own departments to ALL ->",r.status_code)
print("  AdminA now sees:",titles(A))
print()
print("ALL PASS" if all(res) else "SOME FAILED")
