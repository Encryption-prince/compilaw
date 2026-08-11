import ast
import json
import sys


def main():
    file_path = sys.argv[1]

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
        tree = ast.parse(source)
    except Exception:
        print(json.dumps(None))
        return

    findings = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            findings.append({"name": node.id, "line": node.lineno})
        elif isinstance(node, ast.arg):
            findings.append({"name": node.arg, "line": node.lineno})
        elif isinstance(node, ast.keyword) and node.arg:
            findings.append({"name": node.arg, "line": node.lineno})

    print(json.dumps(findings))


if __name__ == "__main__":
    main()