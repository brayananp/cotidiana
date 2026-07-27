import type { ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { cn } from "@/shared/lib/utils";

type ResponsiveDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	children: ReactNode;
	contentClassName?: string;
};

export function ResponsiveDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	contentClassName,
}: ResponsiveDialogProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className={cn("sm:max-w-xl", contentClassName)}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</DialogHeader>
					{children}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					{description && <DrawerDescription>{description}</DrawerDescription>}
				</DrawerHeader>
				<div className={cn("px-4 pb-6", contentClassName)}>{children}</div>
			</DrawerContent>
		</Drawer>
	);
}
