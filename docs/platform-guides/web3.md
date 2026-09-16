# Web3 / wallet integration (optional)

Not wired into the dashboard by default — this is a reference for adding a
wallet-connected template or panel later.

## Client-side wallet connection

```bash
npm install wagmi viem @tanstack/react-query
```

```tsx
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: { [mainnet.id]: http(), [sepolia.id]: http() },
});
```

`wagmi` + `viem` is the current standard pairing (viem replaced ethers.js as
the lower-level client most tooling builds on). Use `sepolia` for testnet
work — never point a template at mainnet with real funds during
development.

## Contract interaction

```ts
import { readContract, writeContract } from "@wagmi/core";

const balance = await readContract(config, {
  address: "0x...",
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [userAddress],
});
```

## Where this would plug in

A `templates/web3-starter/` template (not included by default — add one if
you need it) wired to the store/export panel, using the wallet-connect
pattern above plus a `.env.example` for an RPC URL (Alchemy/Infura free
tier is enough for testnet dev).
