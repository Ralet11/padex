import React, { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { resolveAssetUrl } from '../../services/api';
import { GeneratedAvatar } from './GeneratedAvatar';

export const Avatar = ({
    src,
    uri,
    name,
    size = 40,
    avatarSeed,
    avatar_seed,
    fallbackColor = 'primaryMuted',
    style,
}) => {
    const { colors } = useTheme();
    const [imageFailed, setImageFailed] = useState(false);
    const imageSource = resolveAssetUrl(src || uri);
    const shouldRenderImage = Boolean(imageSource) && !imageFailed;

    useEffect(() => {
        setImageFailed(false);
    }, [imageSource]);

    const containerStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[fallbackColor] || colors.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    };

    return (
        <View style={[containerStyle, style]}>
            {shouldRenderImage ? (
                <Image
                    source={{ uri: imageSource }}
                    style={{ width: '100%', height: '100%' }}
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <GeneratedAvatar
                    seed={avatarSeed || avatar_seed}
                    name={name}
                    size={size}
                />
            )}
        </View>
    );
};
