"""Initialize missing local execution settings without displaying secrets."""
import argparse
import secrets
from pathlib import Path
from dotenv import dotenv_values, set_key


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', type=Path, required=True)
    args = parser.parse_args()
    path = args.env_file
    if not path.is_file():
        raise SystemExit('Environment file must already exist.')
    values = dotenv_values(path)
    additions = {
        'CALLCRAFT_EXECUTION_HMAC_KEY': lambda: secrets.token_hex(32),
        'CALLCRAFT_HTTP_TOOL_ORIGINS': lambda: '{}',
        'CALLCRAFT_RECONCILIATION_BATCH_SIZE': lambda: '20',
        'CALLCRAFT_RECONCILIATION_LEASE_SECONDS': lambda: '60',
    }
    for name, generate in additions.items():
        if not values.get(name):
            set_key(str(path), name, generate())
            print(f'{name}: configured')
        else:
            print(f'{name}: preserved')


if __name__ == '__main__':
    main()
