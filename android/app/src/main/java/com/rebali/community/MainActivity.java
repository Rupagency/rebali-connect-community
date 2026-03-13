package com.rebali.community;

import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String CHANNEL_MESSAGES = "rebali_messages";
    private static final String CHANNEL_DEFAULT  = "rebali_default";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        NotificationManagerCompat mgr = NotificationManagerCompat.from(this);

        // Messages channel with custom sound
        Uri messageSound = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_message"
        );

        NotificationChannelCompat messagesChannel =
            new NotificationChannelCompat.Builder(CHANNEL_MESSAGES, NotificationManagerCompat.IMPORTANCE_HIGH)
                .setName("Messages")
                .setDescription("New message notifications")
                .setSound(messageSound, new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build())
                .setVibrationEnabled(true)
                .setVibrationPattern(new long[]{0, 200, 100, 200})
                .build();

        // Default channel
        NotificationChannelCompat defaultChannel =
            new NotificationChannelCompat.Builder(CHANNEL_DEFAULT, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                .setName("General")
                .setDescription("General notifications")
                .build();

        mgr.createNotificationChannel(messagesChannel);
        mgr.createNotificationChannel(defaultChannel);
    }
}
