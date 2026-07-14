# shadcn/ui Setup Guide

shadcn/ui has been successfully integrated into the project. This guide explains how to use it.

## What's Been Configured

1. **Configuration Files**
   - [`components.json`](components.json) - shadcn/ui configuration with your custom registry
   - [`tailwind.config.js`](tailwind.config.js) - Updated with shadcn/ui theme and plugins
   - [`vite.config.js`](vite.config.js) - Added path aliases for `@` imports
   - [`src/index.css`](src/index.css) - Added CSS variables for theming

2. **Core Dependencies Installed**
   - `tailwindcss-animate` - Animations for components
   - `clsx` - Conditional className utility
   - `tailwind-merge` - Merge Tailwind classes intelligently
   - `class-variance-authority` - Component variant management
   - `lucide-react` - Icon library
   - `@radix-ui/react-label` - Accessible label component

3. **Utility Functions**
   - [`src/lib/utils.js`](src/lib/utils.js) - `cn()` function for merging classes

4. **Base Components Added**
   - [`src/components/ui/button.jsx`](src/components/ui/button.jsx) - Button component with variants
   - [`src/components/ui/card.jsx`](src/components/ui/card.jsx) - Card component
   - [`src/components/ui/input.jsx`](src/components/ui/input.jsx) - Input component
   - [`src/components/ui/label.jsx`](src/components/ui/label.jsx) - Label component

## How to Use

### Importing Components

```jsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
```

### Example Usage

```jsx
function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <Button>Submit</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Adding More Components

### Using the CLI (Recommended)

```bash
cd frontend
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add table
npx shadcn@latest add toast
```

### Available Components

Popular components you can add:
- accordion
- alert
- avatar
- badge
- dialog
- dropdown-menu
- form
- select
- sheet
- table
- tabs
- toast
- tooltip

## Custom Registry

Your custom registry has been configured:
```json
{
  "registries": {
    "@acme": "https://acme.com/r/{name}.json"
  }
}
```

To use components from your custom registry:
```bash
npx shadcn@latest add @acme/[component-name]
```

## Theme Customization

Edit [`src/index.css`](src/index.css) to customize the color scheme:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... more variables */
}
```

## Dark Mode

Dark mode is configured. Add the `dark` class to any parent element to enable:

```jsx
<html className="dark">
  {/* Your app */}
</html>
```

Or toggle dynamically:
```jsx
document.documentElement.classList.toggle('dark')
```

## Notes

- All components use the `@/` alias for imports (configured in [`vite.config.js`](vite.config.js))
- Components use the `cn()` utility for className merging
- All components support variants via `class-variance-authority`
- Components are fully accessible using Radix UI primitives
