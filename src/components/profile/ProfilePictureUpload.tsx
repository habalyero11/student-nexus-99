import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfilePictureUploadProps {
    currentImageUrl?: string | null;
    firstName?: string;
    lastName?: string;
    onUploadComplete: (url: string) => void;
    size?: "sm" | "md" | "lg";
}

const ProfilePictureUpload = ({
    currentImageUrl,
    firstName = "",
    lastName = "",
    onUploadComplete,
    size = "lg",
}: ProfilePictureUploadProps) => {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const sizeClasses = {
        sm: "h-16 w-16",
        md: "h-24 w-24",
        lg: "h-32 w-32",
    };

    const iconSizes = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
    };

    const getInitials = () => {
        const firstInitial = firstName?.charAt(0)?.toUpperCase() || "";
        const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";
        return firstInitial + lastInitial || "?";
    };

    // Helper function to extract file path from public URL
    const extractFilePathFromUrl = (url: string | null): string | null => {
        if (!url) return null;
        try {
            // URL format: https://xxx.supabase.co/storage/v1/object/public/profile-pictures/avatars/filename.ext
            const match = url.match(/profile-pictures\/(.+)$/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    };

    // Helper function to delete old image from storage
    const deleteOldImage = async (imageUrl: string | null) => {
        const filePath = extractFilePathFromUrl(imageUrl);
        if (filePath) {
            try {
                const { error } = await supabase.storage
                    .from("profile-pictures")
                    .remove([filePath]);
                if (error) {
                    console.warn("Failed to delete old image:", error);
                } else {
                    console.log("Old image deleted:", filePath);
                }
            } catch (err) {
                console.warn("Error deleting old image:", err);
            }
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast({
                variant: "destructive",
                title: "Invalid file type",
                description: "Please select an image file (JPG, PNG, GIF, etc.)",
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "File too large",
                description: "Please select an image smaller than 5MB",
            });
            return;
        }

        setUploading(true);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Delete old image first to avoid piling up
            if (previewUrl) {
                await deleteOldImage(previewUrl);
            }

            // Create unique filename
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("profile-pictures")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("profile-pictures")
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            // Update preview
            setPreviewUrl(publicUrl);

            // Update profile in database
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("user_id", user.id);

            if (updateError) throw updateError;

            // Notify parent component
            onUploadComplete(publicUrl);

            toast({
                title: "Success",
                description: "Profile picture updated successfully!",
            });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: error.message || "Failed to upload profile picture",
            });
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemovePicture = async () => {
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Delete the image file from storage
            if (previewUrl) {
                await deleteOldImage(previewUrl);
            }

            // Update profile to remove avatar
            const { error } = await supabase
                .from("profiles")
                .update({ avatar_url: null })
                .eq("user_id", user.id);

            if (error) throw error;

            setPreviewUrl(null);
            onUploadComplete("");

            toast({
                title: "Success",
                description: "Profile picture removed",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to remove profile picture",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className={`${sizeClasses[size]} border-4 border-primary/20`}>
                    <AvatarImage src={previewUrl || undefined} alt="Profile picture" />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                        {getInitials()}
                    </AvatarFallback>
                </Avatar>

                {/* Upload overlay */}
                <div
                    className={`absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer ${uploading ? "opacity-100" : ""
                        }`}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
                    ) : (
                        <Camera className={`${iconSizes[size]} text-white`} />
                    )}
                </div>

                {/* Remove button */}
                {previewUrl && !uploading && (
                    <button
                        type="button"
                        onClick={handleRemovePicture}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Camera className="h-4 w-4 mr-2" />
                            {previewUrl ? "Change Photo" : "Upload Photo"}
                        </>
                    )}
                </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
                Click on the avatar or button to upload.
                <br />
                Max file size: 5MB
            </p>
        </div>
    );
};

export default ProfilePictureUpload;
