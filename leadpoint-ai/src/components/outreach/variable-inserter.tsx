"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Variable, User, Package, Building2, Hash, AtSign } from "lucide-react";

interface VariableOption {
  variable: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "influencer" | "product" | "company" | "campaign";
}

const AVAILABLE_VARIABLES: VariableOption[] = [
  // Influencer variables
  {
    variable: "{first_name}",
    label: "First Name",
    description: "Influencer's first name",
    icon: <User className="h-4 w-4" />,
    category: "influencer",
  },
  {
    variable: "{last_name}",
    label: "Last Name",
    description: "Influencer's last name",
    icon: <User className="h-4 w-4" />,
    category: "influencer",
  },
  {
    variable: "{username}",
    label: "Username",
    description: "Influencer's social media handle",
    icon: <AtSign className="h-4 w-4" />,
    category: "influencer",
  },
  {
    variable: "{follower_count}",
    label: "Follower Count",
    description: "Number of followers (formatted)",
    icon: <Hash className="h-4 w-4" />,
    category: "influencer",
  },
  // Product variables
  {
    variable: "{product_name}",
    label: "Product Name",
    description: "Your product or service name",
    icon: <Package className="h-4 w-4" />,
    category: "product",
  },
  {
    variable: "{product_link}",
    label: "Product Link",
    description: "Link to your product page",
    icon: <Package className="h-4 w-4" />,
    category: "product",
  },
  {
    variable: "{offer_details}",
    label: "Offer Details",
    description: "Special offer or discount info",
    icon: <Package className="h-4 w-4" />,
    category: "product",
  },
  // Company variables
  {
    variable: "{company_name}",
    label: "Company Name",
    description: "Your company or brand name",
    icon: <Building2 className="h-4 w-4" />,
    category: "company",
  },
  {
    variable: "{your_name}",
    label: "Your Name",
    description: "Your full name",
    icon: <User className="h-4 w-4" />,
    category: "company",
  },
  {
    variable: "{your_title}",
    label: "Your Title",
    description: "Your job title or role",
    icon: <Building2 className="h-4 w-4" />,
    category: "company",
  },
  // Campaign variables
  {
    variable: "{campaign_name}",
    label: "Campaign Name",
    description: "Current campaign name",
    icon: <Hash className="h-4 w-4" />,
    category: "campaign",
  },
  {
    variable: "{deadline}",
    label: "Deadline",
    description: "Campaign deadline date",
    icon: <Hash className="h-4 w-4" />,
    category: "campaign",
  },
];

interface VariableInserterProps {
  onInsert: (variable: string) => void;
  disabled?: boolean;
}

export function VariableInserter({ onInsert, disabled }: VariableInserterProps) {
  const influencerVars = AVAILABLE_VARIABLES.filter((v) => v.category === "influencer");
  const productVars = AVAILABLE_VARIABLES.filter((v) => v.category === "product");
  const companyVars = AVAILABLE_VARIABLES.filter((v) => v.category === "company");
  const campaignVars = AVAILABLE_VARIABLES.filter((v) => v.category === "campaign");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Variable className="h-4 w-4 mr-2" />
          Insert Variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Influencer
        </DropdownMenuLabel>
        {influencerVars.map((v) => (
          <DropdownMenuItem
            key={v.variable}
            onClick={() => onInsert(v.variable)}
            className="flex flex-col items-start py-2"
          >
            <div className="flex items-center gap-2 font-medium">
              {v.icon}
              <span>{v.label}</span>
              <code className="ml-auto text-xs text-muted-foreground bg-muted px-1 rounded">
                {v.variable}
              </code>
            </div>
            <span className="text-xs text-muted-foreground ml-6">
              {v.description}
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Product
        </DropdownMenuLabel>
        {productVars.map((v) => (
          <DropdownMenuItem
            key={v.variable}
            onClick={() => onInsert(v.variable)}
            className="flex flex-col items-start py-2"
          >
            <div className="flex items-center gap-2 font-medium">
              {v.icon}
              <span>{v.label}</span>
              <code className="ml-auto text-xs text-muted-foreground bg-muted px-1 rounded">
                {v.variable}
              </code>
            </div>
            <span className="text-xs text-muted-foreground ml-6">
              {v.description}
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Company
        </DropdownMenuLabel>
        {companyVars.map((v) => (
          <DropdownMenuItem
            key={v.variable}
            onClick={() => onInsert(v.variable)}
            className="flex flex-col items-start py-2"
          >
            <div className="flex items-center gap-2 font-medium">
              {v.icon}
              <span>{v.label}</span>
              <code className="ml-auto text-xs text-muted-foreground bg-muted px-1 rounded">
                {v.variable}
              </code>
            </div>
            <span className="text-xs text-muted-foreground ml-6">
              {v.description}
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Campaign
        </DropdownMenuLabel>
        {campaignVars.map((v) => (
          <DropdownMenuItem
            key={v.variable}
            onClick={() => onInsert(v.variable)}
            className="flex flex-col items-start py-2"
          >
            <div className="flex items-center gap-2 font-medium">
              {v.icon}
              <span>{v.label}</span>
              <code className="ml-auto text-xs text-muted-foreground bg-muted px-1 rounded">
                {v.variable}
              </code>
            </div>
            <span className="text-xs text-muted-foreground ml-6">
              {v.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { AVAILABLE_VARIABLES };
export type { VariableOption };
